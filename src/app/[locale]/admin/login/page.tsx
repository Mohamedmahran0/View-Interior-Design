import { setRequestLocale } from 'next-intl/server';
import AdminLoginForm from './admin-login-form';

export default async function AdminLoginPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminLoginForm />;
}
