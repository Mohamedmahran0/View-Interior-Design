'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { useState, useEffect } from 'react';
import { CreditCard, Sparkles, ArrowUpRight, AlertCircle, X, CheckCircle2, Receipt } from 'lucide-react';
import type { Transaction } from '@/types/database';

export default function BillingContent() {
  const { supabase, user } = useSupabase();
  const { subscription, loading } = useSubscription();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setTransactions(data as Transaction[]);
    };
    fetchTransactions();
  }, [user, supabase]);

  const handleCancel = async () => {
    if (!subscription) return;
    setCancelling(true);
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', subscription.id);
    if (error) {
      setCancelMsg({ type: 'error', text: error.message });
    } else {
      setCancelMsg({ type: 'success', text: 'Subscription will be canceled at the end of the billing period.' });
    }
    setCancelling(false);
    setCancelModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-32 mb-4"></div>
          <div className="h-10 bg-white/10 rounded w-48 mb-2"></div>
          <div className="h-4 bg-white/10 rounded w-64"></div>
        </div>
      </div>
    );
  }

  const plan = subscription?.plan;
  const isFree = !plan || plan.name === 'Free';

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Current Plan</h2>
            <p className="text-sm text-white/50 mt-1">Your active subscription details.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl font-bold">{plan?.name || 'Free'}</span>
          {!isFree && plan?.price_monthly && (
            <span className="text-white/50 text-lg">${plan.price_monthly}/mo</span>
          )}
        </div>

        {subscription?.current_period_end && (
          <p className="text-sm text-white/50 mb-6">
            {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on{' '}
            {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
              month: 'long', day: 'numeric', year: 'numeric'
            })}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm">
            <span className="text-white/50">Projects: </span>
            <span className="font-semibold">{plan?.max_projects === -1 || plan?.max_projects === 999999 ? 'Unlimited' : plan?.max_projects}</span>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm">
            <span className="text-white/50">Credits: </span>
            <span className="font-semibold">{plan?.credits_per_month || 0}/mo</span>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg text-sm">
            <span className="text-white/50">Storage: </span>
            <span className="font-semibold">{plan?.max_storage_gb || 0.5} GB</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isFree ? (
            <button
              onClick={() => setCancelModal(true)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition text-sm"
            >
              Cancel Subscription
            </button>
          ) : (
            <a
              href="/pricing"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition"
            >
              <Sparkles size={16} />
              Upgrade Plan
            </a>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Receipt size={20} className="text-white/50" />
          <h2 className="text-xl font-bold">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40">
                  <th className="text-left py-3 px-2 font-medium">Date</th>
                  <th className="text-left py-3 px-2 font-medium">Description</th>
                  <th className="text-right py-3 px-2 font-medium">Amount</th>
                  <th className="text-right py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-2 text-white/60">
                      {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-2">{tx.description || 'Subscription payment'}</td>
                    <td className="py-3 px-2 text-right font-medium">
                      {tx.amount ? `$${(tx.amount / 100).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'succeeded' ? 'bg-emerald-500/15 text-emerald-400' :
                        tx.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                        tx.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                        'bg-gray-500/15 text-gray-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Cancel Subscription</h3>
              <button onClick={() => setCancelModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-white/60 mb-2">
              Your subscription will remain active until the end of the current billing period.
            </p>
            <p className="text-sm text-white/40 mb-6">You can resubscribe at any time.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCancelModal(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm shadow-2xl flex items-center gap-3 ${
          cancelMsg.type === 'success' ? 'bg-emerald-900/90 border border-emerald-500/30 text-emerald-400' : 'bg-red-900/90 border border-red-500/30 text-red-400'
        }`}>
          {cancelMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {cancelMsg.text}
          <button onClick={() => setCancelMsg(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
