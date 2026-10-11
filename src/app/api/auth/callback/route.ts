import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirect = requestUrl.searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Decode and ensure redirect is a valid relative path to prevent open redirect
      let targetPath = redirect;
      try {
        targetPath = decodeURIComponent(redirect);
      } catch (e) {}

      if (!targetPath.startsWith('/')) {
        targetPath = '/' + targetPath;
      }

      const canonicalDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.viewinteriordesign.com';
      const isLocal = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
      const baseOrigin = isLocal ? requestUrl.origin : (canonicalDomain.startsWith('http') ? canonicalDomain : `https://${canonicalDomain}`);

      return NextResponse.redirect(new URL(targetPath, baseOrigin));
    }
  }

  // If error occurred during exchange, redirect to login
  const canonicalDomain = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.viewinteriordesign.com';
  const isLocal = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';
  const baseOrigin = isLocal ? requestUrl.origin : (canonicalDomain.startsWith('http') ? canonicalDomain : `https://${canonicalDomain}`);
  return NextResponse.redirect(new URL('/login?error=oauth_error', baseOrigin));
}
