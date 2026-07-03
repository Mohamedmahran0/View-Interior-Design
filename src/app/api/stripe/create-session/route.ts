import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' });

export async function POST(req: Request) {
  const { priceId, userId, email } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    client_reference_id: userId,
    success_url: `${req.headers.get('origin')}/account/billing?success=true`,
    cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
