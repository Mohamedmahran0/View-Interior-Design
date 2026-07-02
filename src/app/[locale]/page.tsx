import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Download, MonitorPlay, ArrowRight, LayoutDashboard, Languages, Navigation, Sun, Cloud, Wand2, CheckCircle2 } from 'lucide-react';
import Typewriter from '@/components/Typewriter';

export default async function HomePage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('HomePage');
  
  const oppositeLocale = locale === 'ar' ? 'en' : 'ar';
  const oppositeLocaleName = locale === 'ar' ? 'English' : 'العربية';
  const isRtl = locale === 'ar';
  
  return (
    <main className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between p-6 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            V
          </div>
          <span className="font-mono tracking-widest font-bold uppercase text-sm hidden sm:block">{t('title')}</span>
        </div>
        
        <div className="flex items-center gap-6 text-sm font-medium text-white/70">
          <a href="#platform" className="hover:text-emerald-400 transition hidden sm:block">{t('navPlatform')}</a>
          <a href="#plugin" className="hover:text-emerald-400 transition hidden sm:block">{t('navPlugin')}</a>
          <Link href="/editor" className="hover:text-emerald-400 transition hidden sm:block">{t('navEditor')}</Link>
          
          <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
          
          <Link href="/" locale={oppositeLocale} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition border border-white/10 text-white">
            <Languages size={16} />
            <span>{oppositeLocaleName}</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="platform" className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {t('subtitle')}
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/70">
          {t('headline')}
          <span className="block mt-4 text-4xl lg:text-5xl h-[60px] lg:h-[72px]">
            <Typewriter phrases={[t('heroType1'), t('heroType2'), t('heroType3')]} />
          </span>
        </h1>
        
        <p className="text-xl lg:text-2xl text-emerald-400 font-medium mb-8">
          {t('subHeadline')}
        </p>
        
        <p className="text-lg text-white/60 max-w-2xl mb-12 leading-relaxed">
          {t('description')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5">
          <Link href="/editor" className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1">
            <MonitorPlay size={20} />
            {t('startExploring')}
            <ArrowRight size={18} className={`transition-transform ${isRtl ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`} />
          </Link>
          <a href="#plugin" className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-semibold transition-all hover:-translate-y-1 backdrop-blur-md">
            <Download size={20} />
            {t('navPlugin')}
          </a>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="relative z-10 py-24 px-4 bg-neutral-950/80 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">{t('featuresTitle')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Navigation size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('featWalkthroughTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{t('featWalkthroughDesc')}</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sun size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('featLightingTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{t('featLightingDesc')}</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cloud size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('featCloudTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{t('featCloudDesc')}</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wand2 size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('featEditorTitle')}</h3>
              <p className="text-white/60 leading-relaxed text-sm">{t('featEditorDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plugin Section */}
      <section id="plugin" className="relative z-10 py-32 px-4 bg-black/60 border-t border-white/5 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div className="text-emerald-400 font-mono text-sm tracking-widest uppercase">{t('pluginSubtitle')}</div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">{t('pluginTitle')}</h2>
            <p className="text-xl text-white/60 leading-relaxed">
              {t('pluginDesc')}
            </p>
            <ul className="space-y-5 my-8">
              {[
                locale === 'ar' ? 'تصدير مباشر عبر API الخادم' : 'Export direct to platform API', 
                locale === 'ar' ? 'تحويل تلقائي للخامات والمواد' : 'Automatic Material Conversion', 
                locale === 'ar' ? 'توليد رابط استعراض تفاعلي بضغطة زر' : 'One-click Shareable Link'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-4 text-white/80 text-lg">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">✓</div>
                  {feature}
                </li>
              ))}
            </ul>
            <a href="/plugin/OB_Walkthrough_Exporter.mse" download className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-lg transition-all hover:-translate-y-1 shadow-[0_10px_40px_rgba(255,255,255,0.1)]">
              <Download size={24} />
              {t('downloadPlugin')}
            </a>
          </div>
          
          <div className="flex-1 w-full">
            <div className="relative aspect-[4/3] rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/80 to-black/80 backdrop-blur-xl overflow-hidden shadow-2xl flex items-center justify-center group p-8">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="w-full h-full border border-white/5 rounded-2xl bg-black/50 flex flex-col overflow-hidden">
                <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  <div className="ml-4 text-xs font-mono text-white/30">3ds Max Exporter</div>
                </div>
                <div className="flex-1 p-6 flex flex-col gap-4">
                  <div className="h-4 bg-white/5 rounded w-1/3"></div>
                  <div className="h-10 bg-white/5 rounded w-full border border-white/10"></div>
                  <div className="h-10 bg-white/5 rounded w-full border border-white/10"></div>
                  <div className="mt-auto h-12 bg-emerald-500/20 rounded w-full border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-sm">
                    Uploading... 100%
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-32 px-4 bg-neutral-950/50 border-t border-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">{t('pricingTitle')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="relative p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition flex flex-col group">
              <h3 className="text-2xl font-bold mb-2">{t('pricingBasic')}</h3>
              <div className="text-4xl font-bold mb-8 text-emerald-400">{t('pricingBasicPrice')}</div>
              <ul className="space-y-5 mb-10 flex-1 text-white/70">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500"/> 3 Projects</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-500"/> Web Viewer</li>
                <li className="flex items-center gap-3 text-white/30"><CheckCircle2 size={20} /> AI Generator</li>
              </ul>
              <button className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">
                {t('subscribeBtn')}
              </button>
            </div>
            
            {/* Pro Plan */}
            <div className="relative p-8 rounded-[2rem] bg-emerald-900/20 border border-emerald-500/30 backdrop-blur-2xl hover:bg-emerald-900/30 transition flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)] group transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest">Recommended</div>
              <h3 className="text-2xl font-bold mb-2 text-white">{t('pricingPro')}</h3>
              <div className="text-4xl font-bold mb-8 text-emerald-400">{t('pricingProPrice')}<span className="text-lg text-white/50 font-normal">{t('pricingProMo')}</span></div>
              <ul className="space-y-5 mb-10 flex-1 text-white/90">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-400"/> Unlimited Projects</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-400"/> 3ds Max Plugin</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-400"/> HDR Lighting & Controls</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-emerald-400"/> AI Generator Access</li>
              </ul>
              <button className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-1">
                {t('subscribeBtn')}
              </button>
            </div>
            
            {/* Studio Plan */}
            <div className="relative p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition flex flex-col group">
              <h3 className="text-2xl font-bold mb-2">{t('pricingStudio')}</h3>
              <div className="text-4xl font-bold mb-8 text-blue-400">{t('pricingStudioPrice')}<span className="text-lg text-white/50 font-normal">{t('pricingStudioMo')}</span></div>
              <ul className="space-y-5 mb-10 flex-1 text-white/70">
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-blue-400"/> Everything in Pro</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-blue-400"/> Custom Domain</li>
                <li className="flex items-center gap-3"><CheckCircle2 size={20} className="text-blue-400"/> Team Collaboration</li>
              </ul>
              <button className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">
                {t('subscribeBtn')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 text-center text-white/40 border-t border-white/5 bg-black/80 text-sm backdrop-blur-md">
        <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-emerald-500/50 to-blue-500/50 flex items-center justify-center font-bold text-white mb-4">V</div>
        <p>© 2026 View Interior Design. All rights reserved.</p>
      </footer>
    </main>
  );
}
