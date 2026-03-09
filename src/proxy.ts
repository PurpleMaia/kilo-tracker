import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/', '/login', '/register'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for session cookies
    const sessionToken = request.cookies.get('session_token');
    const sysadminToken = request.cookies.get('sysadmin_token');
    const isAuthenticated = !!(sessionToken || sysadminToken);

    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (isAuthenticated && authRoutes.some(route => pathname === route)) {
        console.log(`[proxy] Authenticated user accessing ${pathname}, redirecting to /dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is not authenticated and trying to access protected routes, redirect to login
    if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('type', 'user');
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes (API handles its own auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, images, etc.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
