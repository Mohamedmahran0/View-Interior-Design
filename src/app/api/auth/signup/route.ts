import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { email, password, fullName } = await req.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
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
          full_name: fullName || data.user.email?.split('@')[0] || 'Engineer',
          role: 'engineer',
          subscription_tier: 'free',
          credits_remaining: 5,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Signup profile sync:', e);
    }
  }

  return NextResponse.json({ user: data.user, session: data.session });
}
