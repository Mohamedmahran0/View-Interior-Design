'use client';
import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, UserPlus, Mail, Lock, User, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';

const PLAN_PRICE_MAP: Record<string, string> = {
  basic: process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC_MONTHLY || '',
  pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY || '',
  enterprise: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE_MONTHLY || '',
};

const PLAN_ID_MAP: Record<string, string> = {
  basic: '00000000-0000-0000-0000-000000000002',
  pro: '00000000-0000-0000-0000-000000000003',
  enterprise: '00000000-0000-0000-0000-000000000004',
};

function SignupFormInner() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || '';
  const redirectParam = searchParams.get('redirect');
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [userId, setUserId] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');
    const origin = window.location.origin;
    const target = redirectParam || (selectedPlan ? `/account/billing?plan=${selectedPlan}` : '/projects');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent(target)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/paddle.js';
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
          environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox',
          eventCallback: (event: any) => {
            if (event.name === 'checkout.completed') {
              router.push('/account/billing?success=true');
            }
          },
        });
      }
    };
    document.head.appendChild(script);
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) { setError(t('errorNameRequired')); return; }
    if (!email.trim()) { setError(t('errorEmailRequired')); return; }
    if (!password) { setError(t('errorPasswordRequired')); return; }
    if (password.length < 8) { setError(t('errorPasswordMin')); return; }
    if (password !== confirmPassword) { setError(t('errorPasswordsMatch')); return; }

    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError(t('errorEmailInUse'));
      } else {
        setError(t('errorGeneric'));
      }
      return;
    }

    if (selectedPlan && PLAN_PRICE_MAP[selectedPlan]) {
      setUserId(data?.user?.id || null);
      setStep('payment');
      setSuccess('Account created! Complete your subscription below.');
    } else {
      setSuccess(t('successAccountCreated'));
      if (data?.session) {
        if (redirectParam && redirectParam.startsWith('/')) {
          setTimeout(() => { window.location.href = redirectParam; }, 1500);
        } else {
          setTimeout(() => router.push('/projects'), 1500);
        }
      } else {
        const loginUrl = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login';
        setTimeout(() => router.push(loginUrl), 2000);
      }
    }
  };

  const handlePaddleCheckout = () => {
    const priceId = PLAN_PRICE_MAP[selectedPlan];
    if (!priceId || !window.Paddle) {
      setError('Payment system is not ready. Please try again.');
      return;
    }

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: {
        user_id: userId || '',
        plan_id: PLAN_ID_MAP[selectedPlan] || '',
        plan_name: selectedPlan,
      },
    });
  };

  if (step === 'payment') {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-3 mb-10 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              V
            </div>
          </Link>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl text-center">
            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center mb-6">
                {success}
              </div>
            )}

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
              <CreditCard size={32} />
            </div>

            <h2 className="text-2xl font-bold mb-2">Complete Your Subscription</h2>
            <p className="text-white/50 text-sm mb-2">
              You selected the <span className="text-emerald-400 font-semibold capitalize">{selectedPlan}</span> plan.
            </p>
            <p className="text-white/40 text-xs mb-8">
              Secure payment powered by Paddle. You can cancel anytime.
            </p>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm capitalize">{selectedPlan} Plan</span>
                <span className="text-white/60 text-sm">/month</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={16} className="text-emerald-400" />
                <span className="text-sm text-white/80">All features included</span>
              </div>
              <ul className="space-y-2 text-left">
                {selectedPlan === 'basic' && (
                  <>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> 50 credits/month</li>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> 10 projects</li>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> Basic support</li>
                  </>
                )}
                {selectedPlan === 'pro' && (
                  <>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> 200 credits/month</li>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> Unlimited projects</li>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> Priority support</li>
                    <li className="flex items-center gap-2 text-xs text-white/60"><CheckCircle2 size={14} className="text-emerald-400" /> Premium assets</li>
                  </>
                )}
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handlePaddleCheckout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              <CreditCard size={18} />
              Proceed to Payment
            </button>

            <button
              onClick={() => { setStep('form'); setSuccess(''); }}
              className="w-full mt-3 py-2.5 text-sm text-white/50 hover:text-white/80 transition"
            >
              Back to signup
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-10 group">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-shadow">
            V
          </div>
        </Link>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('signupTitle')}</h1>
            <p className="text-white/50">{t('signupSubtitle')}</p>
            {selectedPlan && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <Sparkles size={12} />
                <span className="capitalize">{selectedPlan}</span> plan selected
              </div>
            )}
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer mb-6"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? t('creatingAccount') : t('googleSignUp')}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-transparent px-3 text-xs text-white/40 uppercase tracking-wider shrink-0">
              {t('orDivider')}
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t('fullNameLabel')}</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t('emailLabel')}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t('passwordLabel')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t('confirmPasswordLabel')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {selectedPlan ? 'Creating account...' : t('creatingAccount')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {selectedPlan ? <><CreditCard size={20} /> Create Account & Subscribe</> : <><UserPlus size={20} /> {t('createAccount')}</>}
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              {t('haveAccount')}{' '}
              <Link
                href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                {t('login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    }>
      <SignupFormInner />
    </Suspense>
  );
}
