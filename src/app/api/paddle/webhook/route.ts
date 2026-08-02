import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET!;

const PLAN_IDS: Record<string, string> = {
  free: '00000000-0000-0000-0000-000000000001',
  basic: '00000000-0000-0000-0000-000000000002',
  pro: '00000000-0000-0000-0000-000000000003',
  enterprise: '00000000-0000-0000-0000-000000000004',
};

async function verifyPaddleSignature(body: string, signatureHeader: string): Promise<boolean> {
  try {
    // Header format: ts=1234567890;h1=hexsignature
    const parts = new Map<string, string>();
    for (const part of signatureHeader.split(';')) {
      const eq = part.indexOf('=');
      if (eq > 0) parts.set(part.slice(0, eq), part.slice(eq + 1));
    }

    const ts = parts.get('ts');
    const h1 = parts.get('h1');
    if (!ts || !h1) return false;

    // Reject signatures older than 5 minutes (replay protection)
    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp)) return false;
    if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Paddle signs: ts + ":" + raw body
    const signedPayload = `${ts}:${body}`;
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === h1.toLowerCase();
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

async function resolvePlanId(serviceClient: any, eventData: any, fallbackName?: string) {
  // 1. Try to match the Paddle price id from the subscription items
  try {
    const items: any[] = eventData?.items || [];
    for (const item of items) {
      const priceId = item?.price?.id;
      if (!priceId) continue;
      const { data } = await serviceClient
        .from('subscription_plans')
        .select('id')
        .eq('paddle_price_id_monthly', priceId)
        .maybeSingle();
      if (data) return data.id;
      const { data: yearly } = await serviceClient
        .from('subscription_plans')
        .select('id')
        .eq('paddle_price_id_yearly', priceId)
        .maybeSingle();
      if (yearly) return yearly.id;
    }
  } catch (err) {
    console.error('Price id plan lookup failed:', err);
  }

  // 2. Fallback: plan name from custom_data
  const name = fallbackName || eventData?.custom_data?.plan_name;
  if (name) {
    const key = String(name).toLowerCase().trim();
    if (PLAN_IDS[key]) return PLAN_IDS[key];
    const { data } = await serviceClient
      .from('subscription_plans')
      .select('id')
      .ilike('name', key)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('paddle-signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 });
    }

    const valid = await verifyPaddleSignature(body, signature);
    if (!valid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    let event: any;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('Failed to parse webhook body:', err);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = event.event_type;
    const eventData = event.data;

    console.log('Paddle webhook received:', eventType);

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscription = eventData;
        const userId = subscription.custom_data?.user_id;

        if (!userId) {
          console.error('No user_id in custom_data for subscription event');
          break;
        }

        const planId = await resolvePlanId(serviceClient, subscription);

        if (!planId) {
          console.error('Could not resolve plan for subscription:', subscription.id);
          break;
        }

        const { data: plan } = await serviceClient
          .from('subscription_plans')
          .select('name, credits_per_month')
          .eq('id', planId)
          .maybeSingle();

        const tier = plan?.name?.toLowerCase() || 'pro';
        const isActive = subscription.status === 'active';

        const { error } = await serviceClient
          .from('user_subscriptions')
          .upsert(
            {
              user_id: userId,
              plan_id: planId,
              status: isActive ? 'active' : subscription.status,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              paddle_customer_id: subscription.customer_id,
              paddle_subscription_id: subscription.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,paddle_subscription_id' }
          );

        if (error) {
          console.error('Failed to upsert subscription:', error);
        }

        // Update profile tier
        await serviceClient
          .from('profiles')
          .update({
            subscription_tier: isActive ? (tier === 'free' ? 'free' : tier) : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // On activation, reset credits to the plan allowance
        if (isActive && plan?.credits_per_month != null) {
          await serviceClient.rpc('reset_user_credits', {
            target_user_id: userId,
            plan_id: planId,
          }).then(({ error: rpcErr }) => {
            if (rpcErr) console.error('Failed to reset credits:', rpcErr);
          });
        }
        break;
      }

      case 'subscription.canceled': {
        const subscription = eventData;
        const userId = subscription.custom_data?.user_id;

        if (userId) {
          await serviceClient
            .from('user_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('paddle_subscription_id', subscription.id);

          await serviceClient
            .from('profiles')
            .update({ subscription_tier: 'free', updated_at: new Date().toISOString() })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription.past_due':
      case 'subscription.paused': {
        const subscription = eventData;
        const userId = subscription.custom_data?.user_id;
        if (userId) {
          await serviceClient
            .from('user_subscriptions')
            .update({ status: eventType === 'subscription.past_due' ? 'past_due' : 'canceled' })
            .eq('user_id', userId)
            .eq('paddle_subscription_id', subscription.id);
        }
        break;
      }

      case 'payment.succeeded': {
        const transaction = eventData;
        const userId = transaction.custom_data?.user_id;

        if (userId) {
          // Match the subscription if this payment belongs to one
          let userSubscriptionId: string | null = null;
          if (transaction.subscription_id) {
            const { data: sub } = await serviceClient
              .from('user_subscriptions')
              .select('id')
              .eq('paddle_subscription_id', transaction.subscription_id)
              .maybeSingle();
            userSubscriptionId = sub?.id || null;
          }

          await serviceClient.from('transactions').insert({
            user_id: userId,
            user_subscription_id: userSubscriptionId,
            paddle_transaction_id: transaction.id,
            amount: transaction.gross_amount ? Number(transaction.gross_amount) : null,
            currency: transaction.currency_code || 'USD',
            status: 'succeeded',
            description: transaction.description || 'Paddle payment',
            created_at: new Date().toISOString(),
          });

          // Renewal payment: refresh monthly credits from the active plan
          if (transaction.subscription_id) {
            const { data: activeSub } = await serviceClient
              .from('user_subscriptions')
              .select('plan_id')
              .eq('paddle_subscription_id', transaction.subscription_id)
              .eq('status', 'active')
              .maybeSingle();
            if (activeSub) {
              await serviceClient.rpc('reset_user_credits', {
                target_user_id: userId,
                plan_id: activeSub.plan_id,
              }).then(({ error: rpcErr }) => {
                if (rpcErr) console.error('Failed to reset credits on renewal:', rpcErr);
              });
            }
          }
        }
        break;
      }

      case 'payment.failed': {
        const transaction = eventData;
        const userId = transaction.custom_data?.user_id;

        if (userId) {
          await serviceClient.from('transactions').insert({
            user_id: userId,
            paddle_transaction_id: transaction.id,
            amount: transaction.gross_amount ? Number(transaction.gross_amount) : null,
            currency: transaction.currency_code || 'USD',
            status: 'failed',
            description: transaction.description || 'Paddle payment failed',
            created_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'transaction.billed': {
        const transaction = eventData;
        const userId = transaction.custom_data?.user_id;
        if (userId) {
          await serviceClient.from('transactions').insert({
            user_id: userId,
            paddle_transaction_id: transaction.id,
            amount: transaction.gross_amount ? Number(transaction.gross_amount) : null,
            currency: transaction.currency_code || 'USD',
            status: 'succeeded',
            description: transaction.description || 'Paddle transaction billed',
            created_at: new Date().toISOString(),
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
