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
      // Auto-sync user profile and personal token to the database automatically
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Engineer';
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

          if (serviceRoleKey && supabaseUrl && !serviceRoleKey.includes('placeholder')) {
            const { createClient: createServiceClient } = await import('@supabase/supabase-js');
            const adminClient = createServiceClient(supabaseUrl, serviceRoleKey);
            await adminClient.from('profiles').upsert({
              id: user.id,
              email: user.email!,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'engineer',
              subscription_tier: 'free',
              credits_remaining: 5,
              status: 'active',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          } else {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email!,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: 'engineer',
              subscription_tier: 'free',
              credits_remaining: 5,
              status: 'active',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
          }
        }
      } catch (syncErr) {
        console.warn('Auto profile database sync:', syncErr);
      }

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
