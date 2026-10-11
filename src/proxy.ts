import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const protectedRoutes = ['/dashboard', '/projects', '/account'];
const adminRoutes = ['/admin/dashboard', '/admin/users', '/admin/subscriptions', '/admin/transactions', '/admin/projects', '/admin/assets', '/admin/settings'];

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // 1. Canonical Domain Enforcement: Redirect any *.vercel.app URLs to www.viewinteriordesign.com
  if (host.includes('.vercel.app') && !host.includes('localhost')) {
    const canonicalDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.viewinteriordesign.com';
    const cleanCanonical = canonicalDomain.startsWith('http') ? canonicalDomain : `https://${canonicalDomain}`;
    const redirectTarget = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      cleanCanonical
    );
    return NextResponse.redirect(redirectTarget, 308);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const localeMatch = path.match(/^\/(ar|en)(?=\/|$)/);
    const redirectParam = request.nextUrl.searchParams.get('redirect');

    let currentLocale = localeMatch ? localeMatch[1] : (request.cookies.get('NEXT_LOCALE')?.value || 'ar');
    if (!['ar', 'en'].includes(currentLocale)) {
      currentLocale = 'ar';
    }

    if (!localeMatch && redirectParam?.startsWith('/en')) {
      currentLocale = 'en';
    } else if (!localeMatch && redirectParam?.startsWith('/ar')) {
      currentLocale = 'ar';
    }

    const pathWithoutLocale = path.replace(/^\/(ar|en)/, '') || '/';

    // If request has no locale prefix and is not root (/), redirect to localized path
    if (!localeMatch && path !== '/') {
      const targetUrl = new URL(`/${currentLocale}${path}`, request.url);
      request.nextUrl.searchParams.forEach((val, key) => {
        targetUrl.searchParams.set(key, val);
      });
      return NextResponse.redirect(targetUrl);
    }

    const isSpecificProject = pathWithoutLocale.startsWith('/editor/') && pathWithoutLocale !== '/editor/new';
    const isProtected = protectedRoutes.some(route => pathWithoutLocale.startsWith(route)) || isSpecificProject;
    const isAdmin = adminRoutes.some(route => pathWithoutLocale.startsWith(route));
    const isAdminLogin = pathWithoutLocale === '/admin/login';

    if (isProtected && !user) {
      const url = new URL(`/${currentLocale}/login`, request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }

    if (isAdmin && !isAdminLogin && !user) {
      return NextResponse.redirect(new URL(`/${currentLocale}/admin/login`, request.url));
    }

    if (user && (pathWithoutLocale === '/login' || pathWithoutLocale === '/signup')) {
      const target = (redirectParam && redirectParam.startsWith('/'))
        ? redirectParam
        : `/${currentLocale}/dashboard`;
      return NextResponse.redirect(new URL(target, request.url));
    }
  } catch (e) {
  }

  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    const response = new NextResponse(intlResponse.body, intlResponse);
    supabaseResponse.cookies.getAll().forEach(c => {
      response.cookies.set(c.name, c.value, c);
    });
    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/(ar|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
