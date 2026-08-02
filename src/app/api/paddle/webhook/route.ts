import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('paddle-signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    let event: any;
    try {
      const encoder = new TextEncoder();
      const secretKeyBytes = encoder.encode(webhookSecret);
      const bodyBytes = encoder.encode(body);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        secretKeyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, bodyBytes);
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (computedSignature !== signature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }

      event = JSON.parse(body);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const eventType = event.event_type;
    const eventData = event.data;

    console.log('Paddle webhook received:', eventType);

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscription = eventData;
        const paddleUserId = subscription.custom_data?.user_id || subscription.customer_id;

        const userId = subscription.custom_data?.user_id;

        if (!userId) {
          console.error('No user_id in custom_data for subscription event');
          break;
        }

        const { data: existingPlan } = await serviceClient
          .from('subscription_plans')
          .select('id')
          .ilike('name', '%pro%')
          .single();

        const planId = existingPlan?.id;

        if (planId) {
          const { error } = await serviceClient
            .from('user_subscriptions')
            .upsert(
              {
                user_id: userId,
                plan_id: planId,
                status: subscription.status === 'active' ? 'active' : subscription.status,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: subscription.cancel_at_period_end || false,
                stripe_subscription_id: subscription.id,
              },
              { onConflict: 'user_id,stripe_subscription_id' }
            );

          if (error) {
            console.error('Failed to upsert subscription:', error);
          }

          await serviceClient
            .from('profiles')
            .update({ subscription_tier: subscription.status === 'active' ? 'pro' : 'free' })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription.canceled': {
        const subscription = eventData;
        const userId = subscription.custom_data?.user_id;

        if (userId) {
          await serviceClient
            .from('user_subscriptions')
            .update({ status: 'canceled' })
            .eq('user_id', userId)
            .eq('stripe_subscription_id', subscription.id);

          await serviceClient
            .from('profiles')
            .update({ subscription_tier: 'free' })
            .eq('id', userId);
        }
        break;
      }

      case 'payment.succeeded': {
        const transaction = eventData;
        const userId = transaction.custom_data?.user_id;

        if (userId) {
          await serviceClient.from('transactions').insert({
            user_id: userId,
            stripe_session_id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency_code,
            status: 'succeeded',
            description: transaction.description || 'Paddle payment',
          });
        }
        break;
      }

      case 'payment.failed': {
        const transaction = eventData;
        const userId = transaction.custom_data?.user_id;

        if (userId) {
          await serviceClient.from('transactions').insert({
            user_id: userId,
            stripe_session_id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency_code,
            status: 'failed',
            description: transaction.description || 'Paddle payment failed',
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Paddle webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
