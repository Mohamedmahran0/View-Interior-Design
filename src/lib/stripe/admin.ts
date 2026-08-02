import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripeInstance = new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
  return stripeInstance;
}

export async function getStripeCustomers() {
  const customers = await getStripe().customers.list({ limit: 100 });
  return customers.data;
}

export async function getStripeSubscriptions() {
  const subscriptions = await getStripe().subscriptions.list({
    status: 'all',
    expand: ['data.customer'],
    limit: 100,
  });
  return subscriptions.data;
}

export async function getRevenueStats(period: 'month' | 'year' = 'month') {
  const now = new Date();
  let startDate: Date;

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    startDate = new Date(now.getFullYear() - 1, 0, 1);
  }

  const payments = await getStripe().paymentIntents.list({
    created: { gte: Math.floor(startDate.getTime() / 1000) },
    limit: 100,
  });

  const totalRevenue = payments.data.reduce((sum, p) => sum + p.amount, 0);
  const successful = payments.data.filter(p => p.status === 'succeeded').length;
  const failed = payments.data.filter(p => (p.status as string) === 'failed').length;

  return { totalRevenue: totalRevenue / 100, successful, failed };
}
