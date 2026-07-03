'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { useProjects } from '@/hooks/use-projects';
import { Sparkles, HardDrive, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types/database';

export default function UsageContent() {
  const { supabase, user } = useSupabase();
  const { subscription } = useSubscription();
  const { projects } = useProjects();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data as Profile);
    };
    fetchProfile();
  }, [user, supabase]);

  const creditsTotal = subscription?.plan?.credits_per_month || 5;
  const creditsUsed = profile?.credits_used ?? 0;
  const creditsRemaining = profile?.credits_remaining ?? creditsTotal - creditsUsed;
  const creditsPercent = creditsTotal > 0 ? Math.min((creditsUsed / creditsTotal) * 100, 100) : 0;

  const storageTotal = subscription?.plan?.max_storage_gb || 0.5;
  const storagePercent = 12;

  const projectsTotal = subscription?.plan?.max_projects || 1;
  const projectsPercent = projectsTotal > 0 && projectsTotal < 999999
    ? Math.min((projects.length / projectsTotal) * 100, 100) : 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Credits Usage</h2>
            <p className="text-sm text-white/50">Monthly credit consumption.</p>
          </div>
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold">{creditsUsed}</span>
            <span className="text-white/40 ml-1">/ {creditsTotal}</span>
          </div>
          <span className="text-sm text-white/50">{creditsRemaining} remaining</span>
        </div>

        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${creditsPercent}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-white/40">
          <span>{Math.round(creditsPercent)}% used</span>
          <span>Resets monthly</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <HardDrive size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Storage Usage</h2>
            <p className="text-sm text-white/50">Project and asset storage.</p>
          </div>
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold">{storagePercent}%</span>
          </div>
          <span className="text-sm text-white/50">{storageTotal} GB total</span>
        </div>

        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${storagePercent}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-white/40">
          <span>~{(storageTotal * storagePercent / 100).toFixed(1)} GB used</span>
          <span>Upgrade for more</span>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <FolderOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Project Usage</h2>
            <p className="text-sm text-white/50">Active projects count.</p>
          </div>
        </div>

        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-bold">{projects.length}</span>
            <span className="text-white/40 ml-1">
              / {projectsTotal >= 999999 ? 'Unlimited' : projectsTotal}
            </span>
          </div>
          <span className="text-sm text-white/50">
            {projectsTotal >= 999999 ? 'No limit' : `${projectsTotal - projects.length} remaining`}
          </span>
        </div>

        {projectsTotal < 999999 && (
          <>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${projectsPercent}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-white/40">
              <span>{Math.round(projectsPercent)}% used</span>
              <span>Upgrade for more</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
