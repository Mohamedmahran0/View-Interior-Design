import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const protectedRoutes = ['/dashboard', '/projects', '/editor', '/account'];
const adminRoutes = ['/admin/dashboard', '/admin/users', '/admin/subscriptions', '/admin/transactions', '/admin/projects', '/admin/assets', '/admin/settings'];

export async function proxy(request: NextRequest) {
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
    const pathWithoutLocale = path.replace(/^\/(ar|en)/, '') || '/';

    const isProtected = protectedRoutes.some(route => pathWithoutLocale.startsWith(route));
    const isAdmin = adminRoutes.some(route => pathWithoutLocale.startsWith(route));
    const isAdminLogin = pathWithoutLocale === '/admin/login';

    if (isProtected && !user) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }

    if (isAdmin && !isAdminLogin && !user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (user && (pathWithoutLocale === '/login' || pathWithoutLocale === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
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
  matcher: ['/', '/(ar|en)/:path*']
};
