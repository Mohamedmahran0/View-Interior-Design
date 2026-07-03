import { setRequestLocale } from 'next-intl/server';
import AdminTransactions from './transactions-client';

export default async function AdminTransactionsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminTransactions />;
}
