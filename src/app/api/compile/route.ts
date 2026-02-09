import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: Request) {
    const { code } = await req.json();

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const llvmOutput = await new Promise<string>((resolve, reject) => {
        const clang = spawn('clang', ['-S', '-emit-llvm', '-O1', '-x', 'c++', '-o', '-', '-']);

        let stdoutData = '';
        let stderrData = '';

        clang.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        clang.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        clang.on('close', (code) => {
            if (code === 0) {
                resolve(stdoutData);
            } else {
                resolve(stderrData || 'Compilation failed');
            }
        });

        clang.on('error', (err) => {
            reject(err);
        });

        clang.stdin.write(code);
        clang.stdin.end();
    });

    return NextResponse.json({ result: llvmOutput });
}