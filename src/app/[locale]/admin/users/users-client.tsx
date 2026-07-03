'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { Profile } from '@/types/database';
import { Search, ChevronLeft, ChevronRight, X, Edit3, Ban, CheckCircle, Trash2, Eye, Plus, Minus, AlertCircle, Users } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlanTier, setEditPlanTier] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (planFilter) {
        query = query.eq('subscription_tier', planFilter);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      query = query.order('created_at', { ascending: false });
      query = query.range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      const { data } = await query;
      setUsers((data || []) as Profile[]);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [search, planFilter, statusFilter, page, supabase]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleEditPlan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: editPlanTier as Profile['subscription_tier'] })
        .eq('id', selectedUser.id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, subscription_tier: editPlanTier as Profile['subscription_tier'] } : u));
      setEditPlanOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: Profile) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(selectedUser.id);
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCredits = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError('');
    try {
      const newCredits = Math.max(0, (selectedUser.credits_remaining || 0) + creditAmount);
      const { error } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('id', selectedUser.id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, credits_remaining: newCredits } : u));
      setSelectedUser(prev => prev ? { ...prev, credits_remaining: newCredits } : null);
      setCreditModalOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users;

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const plans = ['free', 'basic', 'pro', 'enterprise'];
  const statuses = ['active', 'suspended', 'deleted'];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage platform users</p>
        </header>

        <div className="p-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Plans</option>
              {plans.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
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
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Name</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Email</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Plan</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Projects</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Credits</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Status</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Joined</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                              {(user.full_name || user.email)[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{user.full_name || 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/60">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            user.subscription_tier === 'pro' ? 'bg-emerald-500/10 text-emerald-400' :
                            user.subscription_tier === 'basic' ? 'bg-blue-500/10 text-blue-400' :
                            user.subscription_tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-white/5 text-white/40'
                          }`}>{user.subscription_tier}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/60">{user.credits_used || 0}</td>
                        <td className="py-3 px-4 text-sm text-white/60">{user.credits_remaining ?? 0}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            user.status === 'suspended' ? 'bg-red-500/10 text-red-400' :
                            'bg-white/5 text-white/40'
                          }`}>{user.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/40">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/admin/users/${user.id}`)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="View Profile">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => { setSelectedUser(user); setEditPlanTier(user.subscription_tier); setEditPlanOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Edit Plan">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => { setSelectedUser(user); setCreditAmount(0); setCreditModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Add/Remove Credits">
                              <Plus size={14} />
                            </button>
                            <button onClick={() => handleToggleStatus(user)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title={user.status === 'active' ? 'Suspend' : 'Activate'}>
                              {user.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                            </button>
                            <button onClick={() => { setSelectedUser(user); setDeleteConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition" title="Delete">
                              <Trash2 size={14} />
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
                  <button onClick={() => setPage(p => p + 1)} disabled={filteredUsers.length < ITEMS_PER_PAGE} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {editPlanOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Plan</h3>
              <button onClick={() => setEditPlanOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-4">Change plan for <strong className="text-white">{selectedUser.full_name || selectedUser.email}</strong></p>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="space-y-3 mb-6">
              {plans.map(p => (
                <button
                  key={p}
                  onClick={() => setEditPlanTier(p)}
                  className={`w-full p-3 rounded-xl border text-left capitalize transition ${
                    editPlanTier === p ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditPlanOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleEditPlan} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {creditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Update Credits</h3>
              <button onClick={() => setCreditModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Current credits: <strong className="text-white">{selectedUser.credits_remaining ?? 0}</strong>
            </p>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setCreditAmount(prev => prev - 10)} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button onClick={() => setCreditAmount(prev => prev + 10)} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCreditModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleUpdateCredits} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">Delete User</h3>
              <button onClick={() => setDeleteConfirmOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-2">
              Are you sure you want to delete <strong className="text-white">{selectedUser.full_name || selectedUser.email}</strong>?
            </p>
            <p className="text-xs text-red-400/70 mb-6">This action cannot be undone. All user data will be permanently removed.</p>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDeleteUser} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


