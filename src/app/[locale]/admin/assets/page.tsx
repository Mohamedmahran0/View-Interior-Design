import { setRequestLocale } from 'next-intl/server';
import AdminAssets from './assets-client';

export default async function AdminAssetsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminAssets />;
}
