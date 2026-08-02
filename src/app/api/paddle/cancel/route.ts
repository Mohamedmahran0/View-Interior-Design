import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') === 'production'
    ? Environment.production
    : Environment.sandbox,
});

export async function POST(req: Request) {
  try {
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

    const { data: subscription } = await serviceClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription?.paddle_subscription_id) {
      return NextResponse.json({ error: 'No active Paddle subscription found' }, { status: 404 });
    }

    // Cancel at period end in Paddle
    const canceled = await paddle.subscriptions.cancel(
      subscription.paddle_subscription_id,
      { effectiveFrom: 'next_billing_period' }
    );

    await serviceClient
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        status: canceled?.status === 'canceled' ? 'canceled' : subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period.',
    });
  } catch (error: any) {
    console.error('Paddle cancel error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
