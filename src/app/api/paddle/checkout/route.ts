import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { planName } = await req.json();

    if (!planName) {
      return NextResponse.json({ error: 'Missing planName' }, { status: 400 });
    }

    // Authenticate the current user via session cookie
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: plan, error } = await serviceClient
      .from('subscription_plans')
      .select('id, name, price_monthly, paddle_price_id_monthly')
      .ilike('name', String(planName))
      .eq('is_active', true)
      .maybeSingle();

    if (error || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      priceId: plan.paddle_price_id_monthly,
      plan: { id: plan.id, name: plan.name, price_monthly: plan.price_monthly },
      userId: user.id,
      email: user.email,
      message: 'Ready for Paddle.js checkout on the client side.',
    });
  } catch (error: any) {
    console.error('Paddle checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
