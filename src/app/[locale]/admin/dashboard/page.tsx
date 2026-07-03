import { setRequestLocale } from 'next-intl/server';
import AdminDashboard from './dashboard-client';

export default async function AdminDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminDashboard />;
}
