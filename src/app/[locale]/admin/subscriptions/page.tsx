import { setRequestLocale } from 'next-intl/server';
import AdminSubscriptions from './subscriptions-client';

export default async function AdminSubscriptionsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSubscriptions />;
}
