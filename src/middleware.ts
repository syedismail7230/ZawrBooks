import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets, api routes, and Next.js internals are bypassed
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.webp') ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // 1. If accessing login page while already authenticated -> redirect to dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/web', req.url));
    }
    return NextResponse.next();
  }

  // 2. Protected routes: /web, /control, /mobile
  const isProtected =
    pathname.startsWith('/web') ||
    pathname.startsWith('/control') ||
    pathname.startsWith('/mobile') ||
    pathname === '/';

  if (isProtected) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('from', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Role-based route authorization for /control
    if (pathname.startsWith('/control')) {
      const allowedRoles = ['owner', 'director', 'finance_admin'];
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.redirect(new URL('/web?error=unauthorized', req.url));
      }
    }

    // If root '/', redirect authenticated user to their main surface
    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(session.role === 'employee' ? '/mobile' : '/web', req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
