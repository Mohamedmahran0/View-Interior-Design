import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft, DollarSign, User, Calendar, CreditCard, Hash } from 'lucide-react';
import type { Transaction, Profile } from '@/types/database';

export default async function TransactionDetailPage({
  params
}: {
  params: Promise<{ locale: string; txnId: string }>;
}) {
  const { locale, txnId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  const { data: txn } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txnId)
    .single();

  const transaction = txn as Transaction | null;

  let profile: Profile | null = null;
  if (transaction) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', transaction.user_id)
      .single();
    profile = p as Profile | null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin/transactions" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6">
          <ArrowLeft size={16} />
          Back to Transactions
        </Link>

        {!transaction ? (
          <div className="text-center py-20">
            <DollarSign size={48} className="mx-auto text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">Transaction Not Found</h2>
            <p className="text-white/40">This transaction does not exist.</p>
          </div>
        ) : (
          <>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Transaction Details</h1>
                  <p className="text-white/40 text-sm mt-1 font-mono">ID: {transaction.id}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full capitalize ${
                  transaction.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400' :
                  transaction.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                  transaction.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>{transaction.status}</span>
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
                <div className="p-4 rounded-xl bg-white/5 flex items-center gap-3">
                  <DollarSign size={16} className="text-emerald-400" />
                  <div>
                    <p className="text-xs text-white/40 mb-1">Amount</p>
                    <p className="text-lg font-bold">${((transaction.amount || 0) / 100).toFixed(2)} <span className="text-sm font-normal text-white/40 uppercase">{transaction.currency}</span></p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 flex items-center gap-3">
                  <Calendar size={16} className="text-blue-400" />
                  <div>
                    <p className="text-xs text-white/40 mb-1">Date</p>
                    <p className="text-sm">{new Date(transaction.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 flex items-center gap-3">
                  <Hash size={16} className="text-purple-400" />
                  <div>
                    <p className="text-xs text-white/40 mb-1">Stripe Payment Intent</p>
                    <p className="text-sm font-mono">{transaction.stripe_payment_intent_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 flex items-center gap-3">
                  <CreditCard size={16} className="text-amber-400" />
                  <div>
                    <p className="text-xs text-white/40 mb-1">Stripe Session</p>
                    <p className="text-sm font-mono">{transaction.stripe_session_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {transaction.description && (
                <div className="mt-4 p-4 rounded-xl bg-white/5">
                  <p className="text-xs text-white/40 mb-1">Description</p>
                  <p className="text-sm">{transaction.description}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
