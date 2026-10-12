import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (data?.user) {
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (serviceRoleKey && supabaseUrl && !serviceRoleKey.includes('placeholder')) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const adminClient = createServiceClient(supabaseUrl, serviceRoleKey);
        await adminClient.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Engineer',
          role: 'engineer',
          subscription_tier: 'free',
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Login profile sync:', e);
    }
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
