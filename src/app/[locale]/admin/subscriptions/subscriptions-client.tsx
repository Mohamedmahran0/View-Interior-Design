'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { UserSubscription, Profile } from '@/types/database';
import { Search, ChevronLeft, ChevronRight, Eye, X, Ban, Clock, RefreshCw, AlertCircle, CreditCard, TrendingUp, Users } from 'lucide-react';
import { Link } from '@/i18n/routing';

const ITEMS_PER_PAGE = 15;

export default function AdminSubscriptions() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<(UserSubscription & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [selectedSub, setSelectedSub] = useState<UserSubscription | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [extendTrialOpen, setExtendTrialOpen] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: subs } = await query;
      const subscriptionsData = (subs || []) as UserSubscription[];

      let filtered = subscriptionsData;

      if (search) {
        const userIds = filtered.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

        const matchingIds = new Set((profiles || []).map(p => p.id));
        filtered = filtered.filter(s => matchingIds.has(s.user_id));
      }

      const userIds = filtered.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const enriched = filtered.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) as Profile | undefined,
      }));

      setSubscriptions(enriched);
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, supabase]);

  useEffect(() => {
    if (isAdmin) fetchSubscriptions();
  }, [isAdmin, fetchSubscriptions]);

  const handleCancel = async () => {
    if (!selectedSub) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled', cancel_at_period_end: true })
        .eq('id', selectedSub.id);

      if (error) throw error;
      setSubscriptions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status: 'canceled' as const, cancel_at_period_end: true } : s));
      setCancelConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedSub) return;
    setActionLoading(true);
    setActionError('');
    try {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + extendDays);
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ trial_ends_at: newEnd.toISOString() })
        .eq('id', selectedSub.id);

      if (error) throw error;
      setExtendTrialOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const mrr = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + 1, 0);
  const churned = subscriptions.filter(s => s.status === 'canceled').length;
  const totalSubs = subscriptions.length;
  const churnRate = totalSubs > 0 ? (churned / totalSubs) * 100 : 0;
  const arpu = subscriptions.length > 0 ? 0 : 0;

  const paginatedSubs = subscriptions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statuses = ['active', 'canceled', 'past_due', 'incomplete', 'trialing'];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage user subscriptions</p>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl">
              <CreditCard size={18} className="text-emerald-400 mb-2" />
              <p className="text-2xl font-bold">{activeSubs.length}</p>
              <p className="text-xs text-white/40">Active Subscribers</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl">
              <TrendingUp size={18} className="text-blue-400 mb-2" />
              <p className="text-2xl font-bold">${(mrr * 49).toLocaleString()}</p>
              <p className="text-xs text-white/40">MRR (est.)</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-xl">
              <Users size={18} className="text-red-400 mb-2" />
              <p className="text-2xl font-bold">{churnRate.toFixed(1)}%</p>
              <p className="text-xs text-white/40">Churn Rate</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 backdrop-blur-xl">
              <CreditCard size={18} className="text-purple-400 mb-2" />
              <p className="text-2xl font-bold">${arpu.toFixed(2)}</p>
              <p className="text-xs text-white/40">ARPU</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Status</option>
              {statuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : paginatedSubs.length === 0 ? (
            <div className="text-center py-20">
              <CreditCard size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No subscriptions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">User</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Plan</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Start Date</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">End Date</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Status</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Last Payment</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubs.map((sub) => (
                      <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                              {((sub.profile?.full_name || sub.profile?.email || 'U')[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{sub.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-white/40 truncate">{sub.profile?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">Plan #{sub.plan_id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-sm text-white/60">{sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-white/60">{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            sub.status === 'canceled' ? 'bg-red-500/10 text-red-400' :
                            sub.status === 'past_due' ? 'bg-amber-500/10 text-amber-400' :
                            sub.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-white/5 text-white/40'
                          }`}>{sub.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/60">-</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/subscriptions/${sub.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="View Details">
                              <Eye size={14} />
                            </Link>
                            <button onClick={() => { setSelectedSub(sub); setCancelConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition" title="Cancel">
                              <Ban size={14} />
                            </button>
                            <button onClick={() => { setSelectedSub(sub); setExtendTrialOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Extend Trial">
                              <Clock size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Change Plan">
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 text-sm">
                <span className="text-white/40">Page {page}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={paginatedSubs.length < ITEMS_PER_PAGE} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {cancelConfirmOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">Cancel Subscription</h3>
              <button onClick={() => setCancelConfirmOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-6">Are you sure you want to cancel this subscription? The user will retain access until the end of the current billing period.</p>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Keep Active
              </button>
              <button onClick={handleCancel} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {extendTrialOpen && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Extend Trial</h3>
              <button onClick={() => setExtendTrialOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="mb-6">
              <label className="block text-sm text-white/70 mb-2">Extend trial by (days)</label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                min={1}
                max={90}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setExtendTrialOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleExtendTrial} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : `Extend ${extendDays} days`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
