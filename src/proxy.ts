import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    // Path Traversal Mitigation: Implement strict path normalization and validation
    const pathname = request.nextUrl.pathname
    const decodedPathname = decodeURIComponent(pathname)
    if (
        decodedPathname.includes('/..') ||
        decodedPathname.includes('\\..') ||
        decodedPathname.includes('./') ||
        decodedPathname.includes('.\\') ||
        decodedPathname.includes('%2e%2e')
    ) {
        return NextResponse.json({ error: 'Invalid path.' }, { status: 400 })
    }

    // Sensitive Endpoints: Block public access to /admin, /debug, and /actuator
    const sensitivePatterns = [/^\/admin\/?/, /^\/debug\/?/, /^\/actuator\/?/]
    if (sensitivePatterns.some(pattern => pattern.test(pathname))) {
        return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    // Request Smuggling: Normalize header handling between Cloudflare and Original server
    // Ensure we strip potentially dangerous headers if they shouldn't be overridden by the client
    const requestHeaders = new Headers(request.headers)

    // Example of header normalization
    const forwardedHost = requestHeaders.get('x-forwarded-host')
    if (forwardedHost) {
        // Could validate against expected host, or normalize
        requestHeaders.set('host', forwardedHost.split(',')[0].trim())
    }

    // Prevent HTTP smuggling via ambiguous Transfer-Encoding / Content-Length headers
    if (requestHeaders.has('transfer-encoding') && requestHeaders.has('content-length')) {
        return NextResponse.json({ error: 'Invalid Request Headers' }, { status: 400 })
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })
}

export const config = {
    matcher: '/:path*',
}
