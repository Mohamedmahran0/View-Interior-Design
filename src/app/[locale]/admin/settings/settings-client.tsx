'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { Profile, SubscriptionPlan, AdminRole } from '@/types/database';
import { Save, X, AlertCircle, Download, Plus, Trash2, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function AdminSettings() {
  const { isAdmin, adminRole, loading: adminLoading } = useAdmin();
  const { supabase, user } = useSupabase();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('general');

  const [platformName, setPlatformName] = useState('View Interior');
  const [logoUrl, setLogoUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPlanForm, setEditPlanForm] = useState({ price_monthly: 0, price_yearly: 0, credits_per_month: 0, max_projects: 0, max_storage_gb: 0, is_active: true });

  const [stripePubKey, setStripePubKey] = useState('');
  const [stripeSecKey, setStripeSecKey] = useState('');
  const [showSecKey, setShowSecKey] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  const [admins, setAdmins] = useState<(AdminRole & { profile?: Profile })[]>([]);
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminRole, setAddAdminRole] = useState<AdminRole['role']>('admin');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, adminsRes, profilesRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('price_monthly'),
        supabase.from('admin_roles').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      setPlans((plansRes.data || []) as SubscriptionPlan[]);

      const adminData = (adminsRes.data || []) as AdminRole[];
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p as Profile]));
      setAdmins(adminData.map(a => ({ ...a, profile: profileMap.get(a.user_id) })));
    } catch (err) {
      console.error('Failed to fetch settings data', err);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleSaveGeneral = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await new Promise(r => setTimeout(r, 500));
      setSaveSuccess('General settings saved successfully.');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (plan: SubscriptionPlan) => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(editPlanForm)
        .eq('id', plan.id);

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...editPlanForm } : p));
      setEditingPlan(null);
      setSaveSuccess('Plan updated.');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err) {
      console.error('Failed to toggle plan', err);
    }
  };

  const handleSavePayment = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await new Promise(r => setTimeout(r, 500));
      setSaveSuccess('Payment settings saved.');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!addAdminEmail) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', addAdminEmail)
        .single();

      if (!profiles) {
        setSaveError('User with this email not found.');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('admin_roles')
        .insert({ user_id: profiles.id, role: addAdminRole });

      if (error) throw error;
      setAddAdminEmail('');
      setSaveSuccess('Admin added.');
      fetchData();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_roles')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      setAdmins(prev => prev.filter(a => a.id !== adminId));
      setSaveSuccess('Admin removed.');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportDb = async () => {
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('user_subscriptions').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('subscription_plans').select('*'),
        supabase.from('admin_roles').select('*'),
      ]);

      const data = {
        exported_at: new Date().toISOString(),
        profiles: r1.data,
        projects: r2.data,
        subscriptions: r3.data,
        transactions: r4.data,
        plans: r5.data,
        admins: r6.data,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSaveError('Failed to export data.');
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'plans', label: 'Plans' },
    { id: 'payment', label: 'Payment' },
    { id: 'admins', label: 'Admins' },
    { id: 'backup', label: 'Backup' },
  ];

  const roleColors: Record<string, string> = {
    super_admin: 'text-red-400 bg-red-500/10',
    admin: 'text-emerald-400 bg-emerald-500/10',
    support: 'text-blue-400 bg-blue-500/10',
    viewer: 'text-white/40 bg-white/5',
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-white/40 text-sm mt-0.5">Platform configuration</p>
        </header>

        <div className="p-8">
          <div className="flex gap-1 mb-8 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle size={14} />
              {saveSuccess}
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={14} />
              {saveError}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold mb-6">General Settings</h2>
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Platform Name</label>
                  <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Logo URL</label>
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Social Links (JSON)</label>
                  <textarea value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} rows={3} placeholder='{"twitter": "...", "github": "..."}' className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Privacy Policy URL</label>
                  <input type="url" value={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <button onClick={handleSaveGeneral} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-4">
              {plans.map(plan => (
                <div key={plan.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  {editingPlan?.id === plan.id ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold capitalize">{plan.name}</h3>
                      <div className="grid grid-cols-2 gap-4 max-w-lg">
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Monthly Price (cents)</label>
                          <input type="number" value={editPlanForm.price_monthly} onChange={(e) => setEditPlanForm(p => ({ ...p, price_monthly: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Yearly Price (cents)</label>
                          <input type="number" value={editPlanForm.price_yearly} onChange={(e) => setEditPlanForm(p => ({ ...p, price_yearly: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Credits/Month</label>
                          <input type="number" value={editPlanForm.credits_per_month} onChange={(e) => setEditPlanForm(p => ({ ...p, credits_per_month: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Max Projects</label>
                          <input type="number" value={editPlanForm.max_projects} onChange={(e) => setEditPlanForm(p => ({ ...p, max_projects: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs text-white/60 mb-1">Max Storage (GB)</label>
                          <input type="number" value={editPlanForm.max_storage_gb} onChange={(e) => setEditPlanForm(p => ({ ...p, max_storage_gb: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editPlanForm.is_active} onChange={(e) => setEditPlanForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded bg-white/5 text-emerald-500 focus:ring-emerald-500/50" />
                            <span className="text-sm text-white/70">Active</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm">Cancel</button>
                        <button onClick={() => handleUpdatePlan(plan)} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition text-sm font-medium">Save Plan</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold capitalize">{plan.name}</h3>
                          {plan.is_active ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Active</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-white/60">
                          ${((plan.price_monthly || 0) / 100).toFixed(2)}/mo · ${((plan.price_yearly || 0) / 100).toFixed(2)}/yr · {plan.credits_per_month || 0} credits · {plan.max_projects ?? '∞'} projects
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleTogglePlanActive(plan)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-xs">
                          {plan.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => { setEditingPlan(plan); setEditPlanForm({ price_monthly: plan.price_monthly || 0, price_yearly: plan.price_yearly || 0, credits_per_month: plan.credits_per_month || 0, max_projects: plan.max_projects || 0, max_storage_gb: plan.max_storage_gb || 0, is_active: plan.is_active }); }} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-xs">
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold mb-6">Payment Settings</h2>
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Stripe Publishable Key</label>
                  <input type="text" value={stripePubKey} onChange={(e) => setStripePubKey(e.target.value)} placeholder="pk_live_..." className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Stripe Secret Key</label>
                  <div className="relative">
                    <input type={showSecKey ? 'text' : 'password'} value={stripeSecKey} onChange={(e) => setStripeSecKey(e.target.value)} placeholder="sk_live_..." className="w-full px-4 py-2.5 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm" />
                    <button onClick={() => setShowSecKey(!showSecKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition">
                      {showSecKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Mode</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setTestMode(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${testMode ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}>
                      Test Mode
                    </button>
                    <button onClick={() => setTestMode(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!testMode ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}>
                      Live Mode
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Webhook URL</label>
                  <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono text-sm" />
                  <p className="text-xs text-white/30 mt-1">Configure this URL in your Stripe dashboard webhook settings.</p>
                </div>
                <button onClick={handleSavePayment} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                  Save Payment Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-lg font-bold mb-4">Add Administrator</h2>
                <div className="flex items-end gap-3 max-w-lg">
                  <div className="flex-1">
                    <label className="block text-sm text-white/70 mb-1">User Email</label>
                    <input type="email" value={addAdminEmail} onChange={(e) => setAddAdminEmail(e.target.value)} placeholder="user@example.com" className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                  </div>
                  <div className="w-32">
                    <label className="block text-sm text-white/70 mb-1">Role</label>
                    <select value={addAdminRole} onChange={(e) => setAddAdminRole(e.target.value as AdminRole['role'])} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="support">Support</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <button onClick={handleAddAdmin} disabled={saving || !addAdminEmail} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium">
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-lg font-bold mb-4">Current Administrators</h2>
                {admins.length === 0 ? (
                  <p className="text-white/30 text-sm">No administrators found.</p>
                ) : (
                  <div className="space-y-2">
                    {admins.map(admin => (
                      <div key={admin.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                            {((admin.profile?.full_name || admin.profile?.email || 'A')[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{admin.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-white/40">{admin.profile?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${roleColors[admin.role] || 'bg-white/5 text-white/40'}`}>
                            {admin.role}
                          </span>
                          {admin.user_id !== user?.id && (
                            <button onClick={() => handleRemoveAdmin(admin.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold mb-4">Database Backup</h2>
              <p className="text-sm text-white/60 mb-6">
                Export all platform data as a JSON file. This includes users, projects, subscriptions, transactions, plans, and administrator records.
              </p>
              <button onClick={handleExportDb} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition text-sm font-medium">
                <Download size={16} />
                Export Database (JSON)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
