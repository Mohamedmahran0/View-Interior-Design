import { setRequestLocale } from 'next-intl/server';
import AdminSettings from './settings-client';

export default async function AdminSettingsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminSettings />;
}
