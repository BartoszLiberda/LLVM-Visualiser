import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

// Simple in-memory rate limiter
interface RateLimitInfo {
    count: number
    lastReset: number
}
const rateLimitMap = new Map<string, RateLimitInfo>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10 // 10 compiles per minute per IP

// Periodic cleanup to prevent memory leaks from the Map
setInterval(() => {
    const now = Date.now()
    for (const [ip, info] of rateLimitMap.entries()) {
        if (now - info.lastReset > RATE_LIMIT_WINDOW_MS) {
            rateLimitMap.delete(ip)
        }
    }
}, RATE_LIMIT_WINDOW_MS)

function cleanupIR(ir: string): string {
    let lines = ir.split('\n');
    let processed: string[] = [];

    // Pass 1: Clean up and filter
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Strip trailing LLVM metadata
        line = line.replace(/,?\s*![a-zA-Z_].*$/, '');
        line = line.replace(/\s+(nsw|nuw|exact)/g, '');
        line = line.replace(/\s+(dso_local|local_unnamed_addr|mustprogress|noinline|nounwind|optnone|uwtable)/g, '');
        
        let l = line.trim();
        
        // Skip unwanted boilerplate lines and original blank lines
        if (!l) continue;
        if (l.startsWith('source_filename')) continue;
        if (l.startsWith('target datalayout')) continue;
        if (l.startsWith('target triple')) continue;
        if (l.startsWith('attributes #')) continue;
        if (l.startsWith('!')) continue;
        if (l.startsWith(';')) continue;
        
        processed.push(line);
    }
    
    // Pass 2: Re-inject meaningful blank lines and enforce indentation
    let formatted: string[] = [];
    let inDefine = false;

    for (let i = 0; i < processed.length; i++) {
        let line = processed[i];
        let trimmed = line.trim();
        
        // Global variables and declarations
        if (trimmed.startsWith('@') || trimmed.startsWith('declare ')) {
            formatted.push(trimmed);
            continue;
        }

        // Functions
        if (trimmed.startsWith('define ')) {
            inDefine = true;
            if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                formatted.push('');
            }
            formatted.push(trimmed); // define on its own line, no indent
            continue;
        }
        
        // End of functions
        if (trimmed === '}') {
            inDefine = false;
            formatted.push(trimmed);
            if (i < processed.length - 1) {
                formatted.push(''); // Add blank line after function ends
            }
            continue;
        }

        // Basic block labels (must start at column 0 in clang output)
        const isLabel = /^[a-zA-Z_$.\-0-9]+:/.test(line);
        if (isLabel) {
            // Add a blank line before labels, but not right after the 'define' line
            if (formatted.length > 0) {
                const prev = formatted[formatted.length - 1].trim();
                if (prev !== '' && !prev.startsWith('define ') && prev !== '{') {
                    formatted.push('');
                }
            }
            formatted.push(trimmed); // Labels are not indented
            continue;
        }
        
        // Normal instructions
        if (inDefine) {
            formatted.push('  ' + trimmed); // Enforce exactly 2 spaces indent
        } else {
            formatted.push(trimmed);
        }
    }
    
    return formatted.join('\n').trim();
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))
    let { code, language } = body

    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    // Reject code that uses #include — this simulator does not support external libraries.
    // Standard library functions (printf, malloc, std::cout, etc.) will compile to
    // 'declare' stubs in the IR that the simulator cannot execute.
    const includeMatch = code.match(/^\s*#include\s*[<"].+[">]/m);
    if (includeMatch) {
        return NextResponse.json({
            error:
                `Import detected: '${includeMatch[0].trim()}'. ` +
                `This simulator does not support #include directives or external library calls. ` +
                `Standard library functions (e.g. printf, malloc, std::cout) compile to external declarations ` +
                `that cannot be executed. Please remove all #include statements and implement any needed ` +
                `logic directly in your code.`
        }, { status: 422 })
    }

    // Origin Check Mitigation (Basic)
    // Ensures requests are coming from our own frontend domain or localhost
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    // If an Origin is present, ensure it loosely matches the Host to prevent cross-site compilation abuse
    if (origin && host && !origin.includes(host)) {
        return NextResponse.json({ error: 'Unauthorized origin' }, { status: 403 })
    }

    // Rate Limiting Mitigation
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown-ip'
    const now = Date.now()
    let limitInfo = rateLimitMap.get(ip)

    if (!limitInfo || now - limitInfo.lastReset > RATE_LIMIT_WINDOW_MS) {
       limitInfo = { count: 0, lastReset: now }
    }
    
    limitInfo.count++
    rateLimitMap.set(ip, limitInfo)

    if (limitInfo.count > MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json({ error: 'Too many compilation requests. Please try again later.' }, { status: 429 })
    }

    const llvmOutput = await new Promise<string>((resolve, reject) => {

        const clang = spawn('clang', [
            '-S', '-emit-llvm', '-O0', '-x', language === 'c' ? 'c' : 'c++',
            '-target', 'arm64-apple-darwin25.2.0',
            '-fno-crash-diagnostics',
            '-ferror-limit=10',
            '-ftemplate-depth=128',
            '-fconstexpr-depth=128',
            '-fno-caret-diagnostics',
            '-o', '-', '-'
        ])

        const timeout = setTimeout(() => {
            clang.kill('SIGKILL')
            resolve('Error: Compilation Timed Out (Max 5s)')
        }, 5000)

        let stdoutData = ''
        let stderrData = ''

        clang.stdout.on('data', (data) => {
            stdoutData += data.toString()
            if (stdoutData.length > 1024 * 1024) {
                clang.kill('SIGKILL')
                resolve('Error: Output Size Exceeded')
            }
        })

        clang.stderr.on('data', (data) => {
            stderrData += data.toString()
            if (stderrData.length > 1024 * 1024) {
                clang.kill('SIGKILL')
                resolve('Error: Error Output Size Exceeded')
            }
        })

        clang.on('close', (code) => {
            clearTimeout(timeout)
            if (code === 0) {
                resolve(cleanupIR(stdoutData))
            } else {
                resolve(stderrData || 'Compilation failed')
            }
        })

        clang.on('error', (err) => {
            clearTimeout(timeout)
            reject(err)
        })

        clang.stdin.write(code)
        clang.stdin.end()
    })

    return NextResponse.json({ result: llvmOutput })
}