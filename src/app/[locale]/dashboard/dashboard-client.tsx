'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useProjects } from '@/hooks/use-projects';
import { useSubscription } from '@/hooks/use-subscription';
import { Link } from '@/i18n/routing';
import { Plus, CreditCard, FolderOpen, HardDrive, Sparkles, Clock, ExternalLink, ArrowRight, Package, Globe, Lock, FileImage } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Project, Profile } from '@/types/database';

function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
      <div className="h-8 bg-white/10 rounded w-16"></div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl animate-pulse">
      <div className="w-16 h-16 bg-white/10 rounded-lg"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-1/3"></div>
        <div className="h-3 bg-white/10 rounded w-1/4"></div>
      </div>
      <div className="h-6 bg-white/10 rounded w-16"></div>
    </div>
  );
}

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

export default function DashboardClient() {
  const { user, supabase } = useSupabase();
  const { projects, loading: projectsLoading } = useProjects();
  const { subscription, loading: subLoading } = useSubscription();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
      setProfileLoading(false);
    };
    fetchProfile();
  }, [user, supabase]);

  const loading = projectsLoading || subLoading || profileLoading;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="h-8 bg-white/10 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-white/10 rounded w-96 mb-8 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="h-6 bg-white/10 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  const recentProjects = projects.slice(0, 5);
  const creditsUsed = profile?.credits_used ?? 0;
  const creditsRemaining = profile?.credits_remaining ?? 0;
  const planName = subscription?.plan?.name ?? 'Free';
  const maxStorage = subscription?.plan?.max_storage_gb ?? 0.5;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-white/50 mt-1">Here&apos;s an overview of your projects and account.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/editor/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          >
            <Plus size={18} />
            New Project
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/[0.07] transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FolderOpen size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{projects.length}</p>
          <p className="text-sm text-white/50 mt-1">Total Projects</p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/[0.07] transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{creditsRemaining}</p>
          <p className="text-sm text-white/50 mt-1">
            Credits Remaining <span className="text-white/30">({creditsUsed} used)</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/[0.07] transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <HardDrive size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{maxStorage} GB</p>
          <p className="text-sm text-white/50 mt-1">Storage Available</p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/[0.07] transition">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold">{planName}</p>
          <p className="text-sm text-white/50 mt-1">Current Plan</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Recent Projects</h2>
        <Link
          href="/projects"
          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {recentProjects.length === 0 ? (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <FileImage size={28} className="text-white/30" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            Create your first project to start designing and showcasing your work.
          </p>
          <Link
            href="/editor/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition"
          >
            <Plus size={18} />
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3 mb-10">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/editor/${project.id}`}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition group"
            >
              <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {project.thumbnail_url ? (
                  <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileImage size={24} className="text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{project.name}</p>
                <p className="text-sm text-white/50 flex items-center gap-2 mt-0.5">
                  <Clock size={12} />
                  {new Date(project.last_modified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={project.status} />
                {project.is_public ? (
                  <Globe size={14} className="text-white/40" />
                ) : (
                  <Lock size={14} className="text-white/40" />
                )}
                <ExternalLink size={14} className="text-white/20 group-hover:text-white/50 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="font-semibold">Manage your subscription</p>
            <p className="text-sm text-white/50">Upgrade to unlock more projects, credits, and storage.</p>
          </div>
        </div>
        <Link
          href="/account/billing"
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-semibold transition shrink-0"
        >
          Manage Subscription
        </Link>
      </div>
    </div>
  );
}
