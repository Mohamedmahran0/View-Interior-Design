import { setRequestLocale } from 'next-intl/server';
import AccountClient from './account-client';

export default async function AccountPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AccountClient />
    </div>
  );
}
