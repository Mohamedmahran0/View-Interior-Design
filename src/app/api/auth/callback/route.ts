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

      return NextResponse.redirect(new URL(targetPath, requestUrl.origin));
    }
  }

  // If error occurred during exchange, redirect to login
  return NextResponse.redirect(new URL('/login?error=oauth_error', requestUrl.origin));
}
