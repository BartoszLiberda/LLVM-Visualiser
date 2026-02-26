import { NextResponse } from 'next/server'
import { spawn } from 'child_process'

function cleanupIR(ir: string): string {
    return ir
        .split('\n')
        .map(line => {
            let l = line.replace(/,?!.*$/, '').trim()
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
    let { code } = body

    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    // SSTI Mitigation: Sanitize user input by rejecting template-like constructs
    if (code.includes('{{') || code.includes('}}') || code.includes('<%') || code.includes('%>') || code.includes('${')) {
        return NextResponse.json({ error: 'Template injection patterns detected in input' }, { status: 400 })
    }

    const llvmOutput = await new Promise<string>((resolve, reject) => {

        const clang = spawn('clang', [
            '-S', '-emit-llvm', '-O0', '-x', 'c++',
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