'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { Asset, AssetCategory } from '@/types/database';
import { Search, ChevronLeft, ChevronRight, Eye, Edit3, X, Trash2, AlertCircle, Box, Plus, Star, StarOff } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function AdminAssets() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formModelUrl, setFormModelUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formIsPremium, setFormIsPremium] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, catsRes] = await Promise.all([
        supabase.from('assets').select('*').order('created_at', { ascending: false }),
        supabase.from('asset_categories').select('*').order('name'),
      ]);

      let assetsData = (assetsRes.data || []) as Asset[];
      const catsData = (catsRes.data || []) as AssetCategory[];
      setCategories(catsData);

      if (search) {
        const searchLower = search.toLowerCase();
        assetsData = assetsData.filter(a => a.name.toLowerCase().includes(searchLower) || (a.tags && a.tags.some(t => t.toLowerCase().includes(searchLower))));
      }

      if (categoryFilter) {
        assetsData = assetsData.filter(a => a.category_id === categoryFilter);
      }

      if (typeFilter) {
        const isPremium = typeFilter === 'premium';
        assetsData = assetsData.filter(a => a.is_premium === isPremium);
      }

      setAssets(assetsData);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, typeFilter, supabase]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleAddAsset = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase.from('assets').insert({
        name: formName,
        category_id: formCategoryId || null,
        model_url: formModelUrl,
        thumbnail_url: formThumbnailUrl || null,
        is_premium: formIsPremium,
      });

      if (error) throw error;
      setAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAsset = async () => {
    if (!selectedAsset) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          name: formName,
          category_id: formCategoryId || null,
          model_url: formModelUrl,
          thumbnail_url: formThumbnailUrl || null,
          is_premium: formIsPremium,
        })
        .eq('id', selectedAsset.id);

      if (error) throw error;
      setEditModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePremium = async (asset: Asset) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update({ is_premium: !asset.is_premium })
        .eq('id', asset.id);

      if (error) throw error;
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, is_premium: !a.is_premium } : a));
    } catch (err) {
      console.error('Failed to toggle premium', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', selectedAsset.id);

      if (error) throw error;
      setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategoryId('');
    setFormModelUrl('');
    setFormThumbnailUrl('');
    setFormIsPremium(false);
    setSelectedAsset(null);
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormName(asset.name);
    setFormCategoryId(asset.category_id || '');
    setFormModelUrl(asset.model_url);
    setFormThumbnailUrl(asset.thumbnail_url || '');
    setFormIsPremium(asset.is_premium);
    setEditModalOpen(true);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const paginatedAssets = assets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Assets</h1>
            <p className="text-white/40 text-sm mt-0.5">Manage 3D assets library</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Plus size={16} />
            Add New Asset
          </button>
        </header>

        <div className="p-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by name or tags..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Types</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : paginatedAssets.length === 0 ? (
            <div className="text-center py-20">
              <Box size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No assets found</p>
              <button onClick={openAddModal} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-sm font-medium transition">
                Add Your First Asset
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Name</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Category</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Type</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Usage Count</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Added</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAssets.map((asset) => {
                      const cat = categories.find(c => c.id === asset.category_id);
                      return (
                        <tr key={asset.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                {asset.thumbnail_url ? (
                                  <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Box size={16} className="text-white/30" />
                                )}
                              </div>
                              <span className="text-sm font-medium">{asset.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-white/60">{cat?.name || 'Uncategorized'}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${asset.is_premium ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {asset.is_premium ? 'Premium' : 'Free'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-white/60">-</td>
                          <td className="py-3 px-4 text-sm text-white/40">{new Date(asset.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {asset.model_url && (
                                <button onClick={() => window.open(`/viewer?url=${encodeURIComponent(asset.model_url)}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Preview 3D">
                                  <Eye size={14} />
                                </button>
                              )}
                              <button onClick={() => openEditModal(asset)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Edit">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleTogglePremium(asset)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title={asset.is_premium ? 'Make Free' : 'Make Premium'}>
                                {asset.is_premium ? <StarOff size={14} /> : <Star size={14} />}
                              </button>
                              <button onClick={() => { setSelectedAsset(asset); setDeleteConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-6 text-sm">
                <span className="text-white/40">Page {page}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={paginatedAssets.length < ITEMS_PER_PAGE} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {(addModalOpen || editModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{addModalOpen ? 'Add New Asset' : 'Edit Asset'}</h3>
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            {actionError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-white/70 mb-1">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Category</label>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="">Uncategorized</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Model URL</label>
                <input type="url" value={formModelUrl} onChange={(e) => setFormModelUrl(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Thumbnail URL</label>
                <input type="url" value={formThumbnailUrl} onChange={(e) => setFormThumbnailUrl(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={formIsPremium} onChange={(e) => setFormIsPremium(e.target.checked)} className="w-4 h-4 rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500/50" />
                <span className="text-sm text-white/70">Premium Asset</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm font-medium">
                Cancel
              </button>
              <button onClick={addModalOpen ? handleAddAsset : handleEditAsset} disabled={actionLoading || !formName || !formModelUrl} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : addModalOpen ? 'Add Asset' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">Delete Asset</h3>
              <button onClick={() => setDeleteConfirmOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-6">Are you sure you want to delete <strong className="text-white">{selectedAsset.name}</strong>? This cannot be undone.</p>
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
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 transition text-sm font-medium flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
