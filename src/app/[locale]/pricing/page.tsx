import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { CheckCircle2, Sparkles, ArrowRight, HelpCircle } from 'lucide-react';

const plans = ['free', 'basic', 'pro', 'enterprise'] as const;

const features = [
  { key: 'projects' as const, scope: true },
  { key: 'viewer' as const, scope: false },
  { key: 'exports' as const, scope: true },
  { key: 'plugin' as const, scope: false },
  { key: 'ai' as const, scope: false },
  { key: 'hdr' as const, scope: false },
  { key: 'team' as const, scope: false },
  { key: 'domain' as const, scope: false },
  { key: 'support' as const, scope: false },
] as const;

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Pricing');
  const isRtl = locale === 'ar';

  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <nav className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            V
          </div>
          <span className="font-mono tracking-widest font-bold uppercase text-sm hidden sm:block">View</span>
        </Link>
        <Link href="/gallery" className="text-sm text-white/70 hover:text-emerald-400 transition font-medium">
          Gallery
        </Link>
      </nav>

      <section className="relative z-10 pt-24 pb-16 px-4 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium backdrop-blur-md">
          <Sparkles size={16} />
          {t('heroTitle')}
        </div>
        <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-4">{t('heroTitle')}</h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">{t('heroSubtitle')}</p>
      </section>

      <section className="relative z-10 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isPro = plan === 'pro';
            const isEnterprise = plan === 'enterprise';
            const priceKey = `${plan}Price` as const;
            const descKey = `${plan}Desc` as const;
            const planKey = `${plan}Plan` as const;

            return (
              <div
                key={plan}
                className={`relative p-8 rounded-[2rem] backdrop-blur-xl border flex flex-col transition-all duration-300 group ${
                  isPro
                    ? 'bg-emerald-900/20 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] scale-105 lg:scale-110 z-10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest whitespace-nowrap shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={12} />
                      {t('popular')}
                    </span>
                  </div>
                )}

                <h3 className={`text-xl font-bold mb-2 ${isPro ? 'text-white' : 'text-white/80'}`}>{t(planKey)}</h3>
                <p className="text-sm text-white/40 mb-6">{t(descKey)}</p>

                <div className="mb-8">
                  <span className={`text-5xl font-bold ${isPro ? 'text-emerald-400' : isEnterprise ? 'text-blue-400' : 'text-white'}`}>
                    {t(priceKey)}
                  </span>
                  {!isFree(plan) && <span className="text-lg text-white/30 ml-1">{t('perMonth')}</span>}
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {features.map(({ key, scope }) => {
                    const incKey = `feature${key.charAt(0).toUpperCase() + key.slice(1)}${plan.charAt(0).toUpperCase() + plan.slice(1)}` as keyof typeof t;
                    const labelKey = `feature${key.charAt(0).toUpperCase() + key.slice(1)}` as const;
                    const value = t(incKey);
                    const included = value === 'true' || value === true;

                    return (
                      <li key={key} className={`flex items-center gap-3 text-sm ${included ? 'text-white/80' : 'text-white/20'}`}>
                        {included ? (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border border-white/10 shrink-0 flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-white/20 rounded-full"></div>
                          </div>
                        )}
                        <span className={scope ? '' : 'capitalize'}>
                          {scope ? value : t(labelKey)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {isEnterprise ? (
                  <Link
                    href="/contact"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition text-center"
                  >
                    {t('contactSales')}
                    <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
                  </Link>
                ) : (
                  <Link
                    href={isFree(plan) ? '/signup' : '/signup'}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition text-center ${
                      isPro
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {t('getStarted')}
                    <ArrowRight size={18} className={isRtl ? 'rotate-180' : ''} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 pb-32 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t('comparisonTitle')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 pr-8 font-semibold text-white/60">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan} className="py-4 px-4 text-center font-semibold text-white/60">
                      {t(`${plan}Plan` as const)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map(({ key }) => {
                  const labelKey = `feature${key.charAt(0).toUpperCase() + key.slice(1)}` as const;
                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-4 pr-8 text-white/80">{t(labelKey)}</td>
                      {plans.map((plan) => {
                        const incKey = `feature${key.charAt(0).toUpperCase() + key.slice(1)}${plan.charAt(0).toUpperCase() + plan.slice(1)}` as keyof typeof t;
                        const value = t(incKey);
                        const planName = t(`${plan}Plan` as const);

                        return (
                          <td key={plan} className="py-4 px-4 text-center">
                            {value === 'true' || value === true ? (
                              <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={16} />
                                <span className="text-xs">{t('included')}</span>
                              </span>
                            ) : value === 'false' || value === false ? (
                              <span className="text-white/20">{t('notIncluded')}</span>
                            ) : (
                              <span className="text-white/60">{String(value)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-12 text-center text-white/40 border-t border-white/5 bg-black/80 text-sm backdrop-blur-md">
        <p>© 2026 View Interior Design. All rights reserved.</p>
      </footer>
    </main>
  );
}

function isFree(plan: string): plan is 'free' {
  return plan === 'free';
}
