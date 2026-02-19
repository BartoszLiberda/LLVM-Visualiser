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
    const { code } = await req.json()

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    const llvmOutput = await new Promise<string>((resolve, reject) => {
        const clang = spawn('clang', ['-S', '-emit-llvm', '-O0', '-x', 'c++', '-o', '-', '-'])
        //TODO : Need to add flags and sanitize input & output (or move over to WebAssembly for security)
        let stdoutData = ''
        let stderrData = ''

        clang.stdout.on('data', (data) => {
            stdoutData += data.toString()
        })

        clang.stderr.on('data', (data) => {
            stderrData += data.toString()
        })

        clang.on('close', (code) => {
            if (code === 0) {
                resolve(cleanupIR(stdoutData))
            } else {
                resolve(stderrData || 'Compilation failed')
            }
        })

        clang.on('error', (err) => {
            reject(err)
        })

        clang.stdin.write(code)
        clang.stdin.end()
    })

    return NextResponse.json({ result: llvmOutput })
}