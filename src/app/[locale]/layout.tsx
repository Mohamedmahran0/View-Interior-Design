import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {Cairo} from 'next/font/google';
import {SupabaseProvider} from '@/providers/supabase-provider';
import '../globals.css';

const cairo = Cairo({ subsets: ['latin', 'arabic'] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
 
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={`${cairo.className} bg-slate-950 text-white min-h-screen antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <SupabaseProvider>
            {children}
          </SupabaseProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
