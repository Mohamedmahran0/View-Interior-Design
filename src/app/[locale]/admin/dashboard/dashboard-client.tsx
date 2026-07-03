'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import { Users, CreditCard, FolderKanban, TrendingUp, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Profile, UserSubscription, Transaction, Project } from '@/types/database';

interface DashboardData {
  totalUsers: number;
  activeProjects: number;
  monthlyRevenue: number;
  activeSubscribers: number;
  growthRate: number;
  recentUsers: Profile[];
  recentTransactions: Transaction[];
  recentProjects: Project[];
  revenueByMonth: { month: string; revenue: number }[];
  usersByPlan: { plan: string; count: number }[];
  projectsLast30Days: { date: string; count: number }[];
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/admin/login');
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    if (!isAdmin || !user) return;

    const fetchDashboard = async () => {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [profiles, subscriptions, transactions, projects] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('user_subscriptions').select('*'),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
        ]);

        const allProfiles = (profiles.data || []) as Profile[];
        const allSubs = (subscriptions.data || []) as UserSubscription[];
        const allTxns = (transactions.data || []) as Transaction[];
        const allProjects = (projects.data || []) as Project[];

        const activeSubs = allSubs.filter(s => s.status === 'active');
        const succeededTxns = allTxns.filter(t => t.status === 'succeeded');
        const totalRevenue = succeededTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

        const thisMonth = succeededTxns.filter(t => {
          const d = new Date(t.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const monthlyRevenue = thisMonth.reduce((sum, t) => sum + (t.amount || 0), 0);

        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthTxns = succeededTxns.filter(t => {
          const d = new Date(t.created_at);
          return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        });
        const prevRevenue = prevMonthTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
        const growthRate = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        const revenueByMonth: { month: string; revenue: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthTxns = succeededTxns.filter(t => {
            const d = new Date(t.created_at);
            return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
          });
          revenueByMonth.push({
            month: monthNames[m.getMonth()],
            revenue: monthTxns.reduce((sum, t) => sum + (t.amount || 0), 0),
          });
        }

        const planCounts = { free: 0, basic: 0, pro: 0, enterprise: 0 };
        allProfiles.forEach(p => {
          const tier = p.subscription_tier || 'free';
          if (tier in planCounts) planCounts[tier as keyof typeof planCounts]++;
        });
        const usersByPlan = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }));

        const projectsLast30Days: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split('T')[0];
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
          const count = allProjects.filter(p => p.created_at >= dayStart && p.created_at < dayEnd).length;
          projectsLast30Days.push({
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            count,
          });
        }

        setData({
          totalUsers: allProfiles.length,
          activeProjects: allProjects.filter(p => p.status === 'ready' || p.status === 'processing').length,
          monthlyRevenue,
          activeSubscribers: activeSubs.length,
          growthRate: Math.round(growthRate * 100) / 100,
          recentUsers: allProfiles.slice(0, 5),
          recentTransactions: allTxns.slice(0, 5),
          recentProjects: allProjects.slice(0, 5),
          revenueByMonth,
          usersByPlan,
          projectsLast30Days,
        });
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isAdmin, user, supabase]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-white/50 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const maxRevenue = data ? Math.max(...data.revenueByMonth.map(r => r.revenue), 1) : 1;
  const maxProjects = data ? Math.max(...data.projectsLast30Days.map(p => p.count), 1) : 1;
  const totalPlanUsers = data ? data.usersByPlan.reduce((s, p) => s + p.count, 0) : 1;

  const kpiCards = [
    { label: 'Total Users', value: data?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Active Projects', value: data?.activeProjects || 0, icon: FolderKanban, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Monthly Revenue', value: `$${(data?.monthlyRevenue || 0) / 100}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Active Subscribers', value: data?.activeSubscribers || 0, icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    {
      label: 'Growth Rate',
      value: `${data?.growthRate || 0}%`,
      icon: TrendingUp,
      color: (data?.growthRate || 0) >= 0 ? 'text-emerald-400' : 'text-red-400',
      bg: (data?.growthRate || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      border: (data?.growthRate || 0) >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      suffix: (data?.growthRate || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-white/40 text-sm mt-0.5">Platform overview & analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/60">
              <Activity size={14} className="text-emerald-400" />
              Live
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiCards.map((kpi) => (
              <div key={kpi.label} className={`p-5 rounded-2xl ${kpi.bg} ${kpi.border} border backdrop-blur-xl`}>
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon size={20} className={kpi.color} />
                  {kpi.suffix}
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-white/40 text-xs mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Monthly Revenue</h3>
              <div className="flex items-end gap-2 h-48">
                {data?.revenueByMonth.map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-emerald-500/20 rounded-t-md relative" style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 4)}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white/50 whitespace-nowrap">${(item.revenue / 100).toFixed(0)}</div>
                    </div>
                    <span className="text-[10px] text-white/40">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Users by Plan</h3>
              <div className="flex flex-col gap-3">
                {data?.usersByPlan.map((item) => {
                  const pct = totalPlanUsers > 0 ? (item.count / totalPlanUsers) * 100 : 0;
                  const colors: Record<string, string> = { free: 'bg-neutral-600', basic: 'bg-blue-500', pro: 'bg-emerald-500', enterprise: 'bg-purple-500' };
                  return (
                    <div key={item.plan} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[item.plan] || 'bg-neutral-600'}`}></div>
                      <span className="text-sm capitalize flex-1 text-white/70">{item.plan}</span>
                      <span className="text-sm font-medium">{item.count}</span>
                      <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[item.plan] || 'bg-neutral-600'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">New Projects (30 days)</h3>
              <div className="flex items-end gap-[2px] h-48">
                {data?.projectsLast30Days.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-500/30 hover:bg-blue-500/50 transition-colors rounded-t-sm" style={{ height: `${Math.max((item.count / maxProjects) * 100, 2)}%` }}></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-white/30">
                <span>{data?.projectsLast30Days[0]?.date}</span>
                <span>{data?.projectsLast30Days[data.projectsLast30Days.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Recent Users</h3>
              <div className="space-y-3">
                {data?.recentUsers.length === 0 && <p className="text-white/30 text-sm">No users yet</p>}
                {data?.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                      {(u.full_name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-white/40 truncate">{u.email}</p>
                    </div>
                    <span className="text-[10px] text-white/30">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {data?.recentTransactions.length === 0 && <p className="text-white/30 text-sm">No transactions yet</p>}
                {data?.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || 'Transaction'}</p>
                      <p className="text-xs text-white/40">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${((t.amount || 0) / 100).toFixed(2)}</p>
                      <span className={`text-[10px] ${
                        t.status === 'succeeded' ? 'text-emerald-400' :
                        t.status === 'pending' ? 'text-amber-400' :
                        t.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                      }`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Recent Projects</h3>
              <div className="space-y-3">
                {data?.recentProjects.length === 0 && <p className="text-white/30 text-sm">No projects yet</p>}
                {data?.recentProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-white/40">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                      p.status === 'draft' ? 'bg-white/10 text-white/50' :
                      p.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
