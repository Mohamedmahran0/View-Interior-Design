import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

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

    await supabase.auth.getUser();
  } catch (e) {
    // Supabase not configured - continue without auth
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
