import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

export async function getStripeCustomers() {
  const customers = await stripe.customers.list({ limit: 100 });
  return customers.data;
}

export async function getStripeSubscriptions() {
  const subscriptions = await stripe.subscriptions.list({
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

  const payments = await stripe.paymentIntents.list({
    created: { gte: Math.floor(startDate.getTime() / 1000) },
    limit: 100,
  });

  const totalRevenue = payments.data.reduce((sum, p) => sum + p.amount, 0);
  const successful = payments.data.filter(p => p.status === 'succeeded').length;
  const failed = payments.data.filter(p => (p.status as string) === 'failed').length;

  return { totalRevenue: totalRevenue / 100, successful, failed };
}
