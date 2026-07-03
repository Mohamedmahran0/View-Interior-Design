'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAdmin } from '@/hooks/use-admin';
import { useSupabase } from '@/providers/supabase-provider';
import AdminSidebar from '@/components/admin/admin-sidebar';
import type { Project, Profile } from '@/types/database';
import { Search, ChevronLeft, ChevronRight, Eye, X, Globe, Lock, Trash2, AlertCircle, FolderKanban } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function AdminProjects() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();
  const router = useRouter();

  const [projects, setProjects] = useState<(Project & { owner?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) router.push('/admin/login');
  }, [isAdmin, adminLoading, router]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
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

      const { data: projs } = await query;
      let projsData = (projs || []) as Project[];

      if (search) {
        const searchLower = search.toLowerCase();
        const userIds = projsData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

        const matchingUserIds = new Set((profiles || []).map(p => p.id));
        projsData = projsData.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          matchingUserIds.has(p.user_id)
        );
      }

      const userIds = projsData.map(p => p.user_id);
      const { data: owners } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const ownerMap = new Map((owners || []).map(p => [p.id, p]));

      const enriched = projsData.map(p => ({
        ...p,
        owner: ownerMap.get(p.user_id) as Profile | undefined,
      }));

      setProjects(enriched);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, supabase]);

  useEffect(() => {
    if (isAdmin) fetchProjects();
  }, [isAdmin, fetchProjects]);

  const handleToggleVisibility = async (project: Project) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_public: !project.is_public })
        .eq('id', project.id);

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_public: !p.is_public } : p));
    } catch (err) {
      console.error('Failed to update visibility', err);
    }
  };

  const handleChangeStatus = async (project: Project, status: Project['status']) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', project.id);

      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status } : p));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setActionLoading(true);
    setActionError('');
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', selectedProject.id);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const totalProjects = projects.length;
  const publicProjects = projects.filter(p => p.is_public).length;
  const draftProjects = projects.filter(p => p.status === 'draft').length;

  const paginatedProjects = projects.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statuses = ['draft', 'processing', 'ready', 'archived'];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminSidebar />
      <div className="pl-64">
        <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage all platform projects</p>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-xl">
              <FolderKanban size={18} className="text-blue-400 mb-2" />
              <p className="text-2xl font-bold">{totalProjects}</p>
              <p className="text-xs text-white/40">Total Projects</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl">
              <Globe size={18} className="text-emerald-400 mb-2" />
              <p className="text-2xl font-bold">{publicProjects}</p>
              <p className="text-xs text-white/40">Public Projects</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-xl">
              <FolderKanban size={18} className="text-amber-400 mb-2" />
              <p className="text-2xl font-bold">{draftProjects}</p>
              <p className="text-xs text-white/40">Draft Projects</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search by project name or owner..."
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
          ) : paginatedProjects.length === 0 ? (
            <div className="text-center py-20">
              <FolderKanban size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40">No projects found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Name</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Owner</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Status</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Views</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Visibility</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Created</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Modified</th>
                      <th className="pb-3 text-xs font-semibold text-white/40 uppercase tracking-wider px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProjects.map((project) => (
                      <tr key={project.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium truncate max-w-[200px]">{project.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[8px] font-medium text-emerald-400">
                              {((project.owner?.full_name || project.owner?.email || 'U')[0]).toUpperCase()}
                            </div>
                            <span className="text-sm text-white/60 truncate max-w-[120px]">{project.owner?.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                            project.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                            project.status === 'draft' ? 'bg-white/10 text-white/50' :
                            project.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>{project.status}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/60">{project.view_count || 0}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${project.is_public ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                            {project.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/40">{new Date(project.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-sm text-white/40">{project.last_modified ? new Date(project.last_modified).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {project.model_url && (
                              <button onClick={() => window.open(`/viewer?url=${encodeURIComponent(project.model_url!)}`, '_blank')} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title="Preview">
                                <Eye size={14} />
                              </button>
                            )}
                            <select
                              value={project.status}
                              onChange={(e) => handleChangeStatus(project, e.target.value as Project['status'])}
                              className="text-[10px] bg-transparent text-white/40 hover:text-white border border-white/10 rounded px-1 py-0.5"
                              title="Change Status"
                            >
                              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleToggleVisibility(project)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition" title={project.is_public ? 'Make Private' : 'Make Public'}>
                              {project.is_public ? <Lock size={14} /> : <Globe size={14} />}
                            </button>
                            <button onClick={() => { setSelectedProject(project); setDeleteConfirmOpen(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition" title="Delete">
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
                  <button onClick={() => setPage(p => p + 1)} disabled={paginatedProjects.length < ITEMS_PER_PAGE} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {deleteConfirmOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">Delete Project</h3>
              <button onClick={() => setDeleteConfirmOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-2">
              Are you sure you want to delete <strong className="text-white">{selectedProject.name}</strong>?
            </p>
            <p className="text-xs text-red-400/70 mb-6">This action cannot be undone.</p>
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
