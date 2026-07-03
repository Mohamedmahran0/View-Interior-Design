'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { Transaction, Profile } from '@/types/database';
import { Search, ChevronLeft, ChevronRight, Eye, X, RotateCcw, FileText, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { Link } from '@/i18n/routing';

const ITEMS_PER_PAGE = 15;

export default function AdminTransactions() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [transactions, setTransactions] = useState<(Transaction & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      const { data: txns } = await query;
      let txnsData = (txns || []) as Transaction[];

      if (search) {
        const userIds = txnsData.map(t => t.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

        const matchingIds = new Set((profiles || []).map(p => p.id));
        txnsData = txnsData.filter(t => matchingIds.has(t.user_id));
      }

      const userIds = txnsData.map(t => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const enriched = txnsData.map(t => ({
        ...t,
        profile: profileMap.get(t.user_id) as Profile | undefined,
      }));

      setTransactions(enriched);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, supabase]);

  useEffect(() => {
    if (isAdmin) fetchTransactions();
  }, [isAdmin, fetchTransactions]);

  const handleRefund = async () => {
    if (!selectedTxn) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', selectedTxn.id);

      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === selectedTxn.id ? { ...t, status: 'refunded' as const } : t));
      setRefundConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'succeeded')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const now = new Date();
  const monthlyRevenue = transactions
    .filter(t => t.status === 'succeeded' && new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear())
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const annualRevenue = transactions
    .filter(t => t.status === 'succeeded' && new Date(t.created_at).getFullYear() === now.getFullYear())
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const stripeFees = Math.round(totalRevenue * 0.029 + transactions.filter(t => t.status === 'succeeded').length * 30);

  const paginatedTxns = transactions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statuses = ['pending', 'succeeded', 'failed', 'refunded'];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-white/40 text-sm mt-0.5">Monitor payment transactions</p>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl">
              <DollarSign size={18} className="text-emerald-400 mb-2" />
              <p className="text-2xl font-bold">${(totalRevenue / 100).toLocaleString()}</p>
              <p className="text-xs text-white/40">Total Revenue</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl">
              <Calendar size={18} className="text-blue-400 mb-2" />
              <p className="text-2xl font-bold">${(monthlyRevenue / 100).toLocaleString()}</p>
              <p className="text-xs text-white/40">Monthly Revenue</p>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 backdrop-blur-xl">
              <DollarSign size={18} className="text-purple-400 mb-2" />
              <p className="text-2xl font-bold">${(annualRevenue / 100).toLocaleString()}</p>
              <p className="text-xs text-white/40">Annual Revenue</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 backdrop-blur-xl">
              <DollarSign size={18} className="text-red-400 mb-2" />
              <p className="text-2xl font-bold">${(stripeFees / 100).toLocaleString()}</p>
              <p className="text-xs text-white/40">Stripe Fees (est.)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by user..."
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : paginatedTxns.length === 0 ? (
            <div className="text-center py-20">
              <DollarSign size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">ID</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">User</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Amount</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Currency</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Status</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Date</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Plan</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTxns.map((txn) => (
                      <tr key={txn.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 text-sm text-white/40 font-mono">{txn.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                              {((txn.profile?.full_name || txn.profile?.email || 'U')[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{txn.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-white/40 truncate">{txn.profile?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">${((txn.amount || 0) / 100).toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-white/60 uppercase">{txn.currency}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                            txn.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400' :
                            txn.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                            txn.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>{txn.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/60">{new Date(txn.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-sm text-white/60">{txn.description || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/transactions/${txn.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="View Detail">
                              <Eye size={14} />
                            </Link>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Issue Invoice">
                              <FileText size={14} />
                            </button>
                            {txn.status === 'succeeded' && (
                              <button onClick={() => { setSelectedTxn(txn); setRefundConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400/50 hover:text-amber-400 transition" title="Refund">
                                <RotateCcw size={14} />
                              </button>
                            )}
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
                  <button onClick={() => setPage(p => p + 1)} disabled={paginatedTxns.length < ITEMS_PER_PAGE} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {refundConfirmOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-amber-400">Issue Refund</h3>
              <button onClick={() => setRefundConfirmOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-2">
              Refund transaction <strong className="text-white">${((selectedTxn.amount || 0) / 100).toFixed(2)}</strong>?
            </p>
            <p className="text-xs text-amber-400/70 mb-6">This will mark the transaction as refunded in the database. Stripe refund must be processed separately.</p>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRefundConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleRefund} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Mark as Refunded'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
