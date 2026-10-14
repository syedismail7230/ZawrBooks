import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

function applyNoRobotsHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'X-Robots-Tag',
    'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate'
  );
  return response;
}

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
    pathname === '/manifest.json' ||
    pathname === '/robots.txt'
  ) {
    return applyNoRobotsHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = !!session;

  // 1. If accessing login page while already authenticated -> redirect to dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return applyNoRobotsHeaders(NextResponse.redirect(new URL('/web', req.url)));
    }
    return applyNoRobotsHeaders(NextResponse.next());
  }

  // 2. Protected routes: /web, /control, /mobile, /
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
      return applyNoRobotsHeaders(NextResponse.redirect(loginUrl));
    }

    // Role-based route authorization for /control: STRICTLY CEO ONLY
    if (pathname.startsWith('/control')) {
      const isCeo = session.role === 'owner' && (session.email?.toLowerCase() === 'ceo@zawrindustries.com' || session.fullName?.toLowerCase().includes('syed ismail'));
      if (!isCeo) {
        return applyNoRobotsHeaders(NextResponse.redirect(new URL('/web?error=ceo_only_access', req.url)));
      }
    }

    // If root '/', redirect authenticated user to their main surface
    if (pathname === '/') {
      return applyNoRobotsHeaders(
        NextResponse.redirect(
          new URL(session.role === 'employee' ? '/mobile' : '/web', req.url)
        )
      );
    }
  }

  return applyNoRobotsHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
