import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {Cairo} from 'next/font/google';
import {SupabaseProvider} from '@/providers/supabase-provider';
import '../globals.css';
import type {Metadata, Viewport} from 'next';

const cairo = Cairo({ subsets: ['latin', 'arabic'] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://view-interior-design.com'
  ),
  title: {
    default: 'View Interior Design — Smart Interior Design Platform',
    template: '%s | View Interior Design',
  },
  description:
    'Design, export and present interior walkthroughs with one click. The future of interior design — photorealistic 3D, AI generation and a real 3ds Max exporter plugin.',
  applicationName: 'View Interior Design',
  keywords: [
    'interior design',
    '3d walkthrough',
    '3ds max plugin',
    '3d viewer',
    'تصميم داخلي',
    'ديكور',
  ],
  authors: [{ name: 'View Interior Design' }],
  creator: 'View Interior Design',
  publisher: 'View Interior Design',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_AR',
    url: 'https://view-interior-design.com',
    siteName: 'View Interior Design',
    title: 'View Interior Design — Smart Interior Design Platform',
    description:
      'Design, export and share stunning interior walkthroughs with one click. Real 3ds Max plugin included.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'View Interior Design Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@viewinterior',
    creator: '@viewinterior',
    title: 'View Interior Design — Smart Interior Design Platform',
    description:
      'Design, export and share stunning interior walkthroughs with one click.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark',
};

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