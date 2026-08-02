import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: Environment.sandbox,
});

export { paddle };

export async function getPaddleTransactions() {
  const transactions = await paddle.transactions.list();
  return transactions;
}

export async function getPaddleSubscriptions() {
  const subscriptions = await paddle.subscriptions.list();
  return subscriptions;
}

export async function cancelPaddleSubscription(subscriptionId: string) {
  const subscription = await paddle.subscriptions.cancel(subscriptionId);
  return subscription;
}
