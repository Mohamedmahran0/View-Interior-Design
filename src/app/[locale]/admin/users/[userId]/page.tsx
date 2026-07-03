import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, Mail, Calendar, CreditCard, FolderKanban, DollarSign, Shield } from 'lucide-react';
import type { Profile, Project, UserSubscription, Transaction } from '@/types/database';

export default async function UserDetailPage({
  params
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const user = profile as Profile | null;
  const userProjects = (projects || []) as Project[];
  const userSubs = (subscriptions || []) as UserSubscription[];
  const userTxns = (transactions || []) as Transaction[];

  const planColors: Record<string, string> = {
    free: 'bg-white/5 text-white/40',
    basic: 'bg-blue-500/10 text-blue-400',
    pro: 'bg-emerald-500/10 text-emerald-400',
    enterprise: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
          <ArrowLeft size={16} />
          Back to Users
        </Link>

        {!user ? (
          <div className="text-center py-20">
            <Shield size={48} className="mx-auto text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">User Not Found</h2>
            <p className="text-white/40">This user does not exist or has been deleted.</p>
          </div>
        ) : (
          <>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-2xl font-bold shadow-lg shrink-0">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">{user.full_name || 'Unnamed User'}</h1>
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                        <span className="flex items-center gap-1.5"><Mail size={14} />{user.email}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={14} />Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full capitalize ${planColors[user.subscription_tier] || ''}`}>
                      {user.subscription_tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-xs text-white/40">Credits Remaining</p>
                      <p className="text-lg font-bold">{user.credits_remaining ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Credits Used</p>
                      <p className="text-lg font-bold">{user.credits_used ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Status</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${
                        user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        user.status === 'suspended' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/40'
                      }`}>{user.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <FolderKanban size={16} className="text-blue-400" />
                  <h2 className="text-lg font-bold">Projects ({userProjects.length})</h2>
                </div>
                {userProjects.length === 0 ? (
                  <p className="text-white/30 text-sm py-4">No projects yet.</p>
                ) : (
                  <div className="space-y-2">
                    {userProjects.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-white/40">{new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          p.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                          p.status === 'draft' ? 'bg-white/10 text-white/50' :
                          p.status === 'processing' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                        }`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={16} className="text-amber-400" />
                  <h2 className="text-lg font-bold">Subscriptions ({userSubs.length})</h2>
                </div>
                {userSubs.length === 0 ? (
                  <p className="text-white/30 text-sm py-4">No subscriptions.</p>
                ) : (
                  <div className="space-y-2">
                    {userSubs.map((s) => (
                      <div key={s.id} className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            s.status === 'canceled' ? 'bg-red-500/10 text-red-400' :
                            s.status === 'past_due' ? 'bg-amber-500/10 text-amber-400' :
                            s.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/40'
                          }`}>{s.status}</span>
                          {s.cancel_at_period_end && <span className="text-[10px] text-amber-400">Cancel at period end</span>}
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString() : 'N/A'} - {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-emerald-400" />
                <h2 className="text-lg font-bold">Transactions ({userTxns.length})</h2>
              </div>
              {userTxns.length === 0 ? (
                <p className="text-white/30 text-sm py-4">No transactions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left">
                        <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-3">ID</th>
                        <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-3">Amount</th>
                        <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-3">Status</th>
                        <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTxns.map((t) => (
                        <tr key={t.id} className="border-b border-white/5">
                          <td className="py-3 px-3 text-sm text-white/40 font-mono">{t.id.slice(0, 8)}...</td>
                          <td className="py-3 px-3 text-sm font-medium">${((t.amount || 0) / 100).toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              t.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400' :
                              t.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                              t.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>{t.status}</span>
                          </td>
                          <td className="py-3 px-3 text-sm text-white/40">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
