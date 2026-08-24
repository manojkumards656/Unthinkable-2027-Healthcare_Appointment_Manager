import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const publicPaths = ['/login', '/register', '/', '/api'];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix if present (/en, /ta, /hi)
  const pathWithoutLocale = pathname.replace(/^\/(en|ta|hi)/, '');
  if (pathWithoutLocale === '' || pathWithoutLocale === '/') return true;
  return publicPaths.some((p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + '/'));
}

function decodeSessionCookie(cookie: string): { uid: string; role: string; email?: string } | null {
  try {
    const payload = cookie.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return {
      uid: decoded.user_id || decoded.uid || decoded.sub,
      role: decoded.role || 'PATIENT',
      email: decoded.email,
    };
  } catch {
    return null;
  }
}

const roleProtectedPaths: Record<string, string> = {
  '/dashboard/doctor': 'DOCTOR',
  '/doctor': 'DOCTOR',
  '/dashboard/admin': 'ADMIN',
  '/admin': 'ADMIN',
};

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js handle static assets and direct /api calls
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 1. Run next-intl middleware for locale handling
  const intlResponse = intlMiddleware(request);

  // Determine current locale (defaults to 'en')
  const localeMatch = pathname.match(/^\/(en|ta|hi)/);
  const currentLocale = localeMatch ? localeMatch[1] : 'en';

  // 2. If it's a public route, return intl response
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // 3. Check for Firebase session cookie
  const session = request.cookies.get('__session')?.value;
  if (!session) {
    const loginUrl = new URL(`/${currentLocale}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Decode JWT payload
  const user = decodeSessionCookie(session);
  if (!user) {
    const loginUrl = new URL(`/${currentLocale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based route guard
  const pathWithoutLocale = pathname.replace(/^\/(en|ta|hi)/, '');
  for (const [protectedPrefix, requiredRole] of Object.entries(roleProtectedPaths)) {
    if (pathWithoutLocale.startsWith(protectedPrefix)) {
      if (user.role !== requiredRole && user.role !== 'ADMIN') {
        const fallbackDashboard = new URL(
          `/${currentLocale}/dashboard/${user.role.toLowerCase()}`,
          request.url
        );
        return NextResponse.redirect(fallbackDashboard);
      }
    }
  }

  // 6. Enrich headers
  intlResponse.headers.set('x-user-id', user.uid);
  intlResponse.headers.set('x-user-role', user.role);

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
