import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, CreditCard, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { UserSubscription, Profile } from '@/types/database';

export default async function SubscriptionDetailPage({
  params
}: {
  params: Promise<{ locale: string; subId: string }>;
}) {
  const { locale, subId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('id', subId)
    .single();

  const subscription = sub as UserSubscription | null;

  let profile: Profile | null = null;
  if (subscription) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', subscription.user_id)
      .single();
    profile = p as Profile | null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin/subscriptions" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
          <ArrowLeft size={16} />
          Back to Subscriptions
        </Link>

        {!subscription ? (
          <div className="text-center py-20">
            <CreditCard size={48} className="mx-auto text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">Subscription Not Found</h2>
            <p className="text-white/40">This subscription does not exist.</p>
          </div>
        ) : (
          <>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Subscription Details</h1>
                  <p className="text-white/40 text-sm mt-1 font-mono">ID: {subscription.id}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full capitalize ${
                  subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                  subscription.status === 'canceled' ? 'bg-red-500/10 text-red-400' :
                  subscription.status === 'past_due' ? 'bg-amber-500/10 text-amber-400' :
                  subscription.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-white/5 text-white/40'
                }`}>{subscription.status}</span>
              </div>

              {profile && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-medium text-emerald-400">
                    {(profile.full_name || profile.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{profile.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-white/40">{profile.email}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Plan ID</p>
                  <p className="text-sm font-mono">{subscription.plan_id}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Stripe Customer</p>
                  <p className="text-sm font-mono">{subscription.stripe_customer_id || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Start Date</p>
                  <p className="text-sm">{subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">End Date</p>
                  <p className="text-sm">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Trial Ends</p>
                  <p className="text-sm">{subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Cancel at Period End</p>
                  <p className="text-sm flex items-center gap-1">
                    {subscription.cancel_at_period_end ? (
                      <><CheckCircle2 size={14} className="text-amber-400" /> Yes</>
                    ) : (
                      <><XCircle size={14} className="text-white/40" /> No</>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-white/5 flex items-center gap-3">
                <Calendar size={16} className="text-white/40" />
                <span className="text-sm text-white/60">Created {new Date(subscription.created_at).toLocaleString()}</span>
              </div>
            </div>

            {subscription.status === 'past_due' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <AlertTriangle size={16} />
                This subscription is past due. The user may lose access soon.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
