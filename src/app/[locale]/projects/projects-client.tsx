'use client';

import { useProjects } from '@/hooks/use-projects';
import { Link } from '@/i18n/routing';
import { Plus, MoreHorizontal, Edit3, Eye, Trash2, Share2, Globe, Lock, Clock, FileImage, FolderOpen, AlertCircle, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Project } from '@/types/database';

function StatusBadge({ status }: { status: Project['status'] }) {
  const styles: Record<string, string> = {
    draft: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    processing: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    archived: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/5"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded w-2/3"></div>
        <div className="h-3 bg-white/10 rounded w-1/3"></div>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-white/10 rounded w-16"></div>
          <div className="h-4 bg-white/10 rounded w-8"></div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsClient() {
  const { projects, loading, error, deleteProject } = useProjects();
  const [filter, setFilter] = useState<Project['status'] | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const success = await deleteProject(deleteTarget.id);
    if (success) setDeleteTarget(null);
    setDeleting(false);
  };

  const filters: { label: string; value: Project['status'] | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Ready', value: 'ready' },
    { label: 'Archived', value: 'archived' },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 bg-white/10 rounded w-48 animate-pulse"></div>
          <div className="h-11 bg-white/10 rounded w-36 animate-pulse"></div>
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-9 bg-white/10 rounded-full w-20 animate-pulse"></div>)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>
          <p className="text-white/50 mt-1">{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/editor/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] shrink-0"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === f.value
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/10 hover:bg-white/[0.07]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
            <FolderOpen size={36} className="text-white/30" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No {filter !== 'all' ? filter : ''} projects found</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            {filter !== 'all'
              ? `You don't have any ${filter} projects yet.`
              : 'Get started by creating your first design project.'}
          </p>
          <Link
            href="/editor/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition"
          >
            <Plus size={18} />
            Create New Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden hover:bg-white/[0.07] transition">
              <Link href={`/editor/${project.id}`} className="block">
                <div className="aspect-video bg-white/5 flex items-center justify-center overflow-hidden relative">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileImage size={36} className="text-white/20" />
                  )}
                </div>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/editor/${project.id}`} className="font-semibold truncate block hover:text-emerald-400 transition">
                      {project.name}
                    </Link>
                    <p className="text-xs text-white/40 flex items-center gap-1.5 mt-1">
                      <Clock size={11} />
                      {new Date(project.last_modified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition text-white/40 hover:text-white"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl z-50 py-1.5">
                        <Link
                          href={`/editor/${project.id}`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
                        >
                          <Edit3 size={14} /> Edit
                        </Link>
                        <Link
                          href={`/viewer?url=${encodeURIComponent(project.model_url || '')}`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
                        >
                          <Eye size={14} /> Preview
                        </Link>
                        <button
                          onClick={() => { setOpenMenuId(null); navigator.clipboard.writeText(`${window.location.origin}/viewer?url=${project.model_url || ''}`); }}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition w-full text-left"
                        >
                          <Share2 size={14} /> Share
                        </button>
                        <div className="border-t border-white/10 my-1"></div>
                        <button
                          onClick={() => { setOpenMenuId(null); setDeleteTarget(project); }}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition w-full text-left"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <StatusBadge status={project.status} />
                  {project.is_public ? (
                    <Globe size={14} className="text-white/40" />
                  ) : (
                    <Lock size={14} className="text-white/40" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Delete Project</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-white/60 mb-2">
              Are you sure you want to delete <span className="text-white font-semibold">{deleteTarget.name}</span>?
            </p>
            <p className="text-sm text-white/40 mb-6">This action cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
