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
    return ir
        .split('\n')
        .map(line => {
            // Strip trailing LLVM metadata like `, !dbg !12` but don't break string literals containing `!`
            let l = line.replace(/,?\s*![a-zA-Z_].*$/, '').trim()
            l = l.replace(/\s+(nsw|nuw|exact)/g, '')
            l = l.replace(/\s+(dso_local|local_unnamed_addr|mustprogress|noinline|nounwind|optnone|uwtable)/g, '')
            return l
        })
        .filter(line => {
            const l = line.trim()
            if (!l) return false
            if (l.startsWith('source_filename')) return false
            if (l.startsWith('target datalayout')) return false
            if (l.startsWith('target triple')) return false
            if (l.startsWith('attributes #')) return false
            if (l.startsWith('!')) return false
            if (l.startsWith(';')) return false
            return true
        })
        .join('\n')
        .trim()
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))
    let { code, language } = body

    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
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