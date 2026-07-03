'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@/types/database';

export function useProjects() {
  const { supabase, user } = useSupabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('last_modified', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (name: string, description?: string) => {
    if (!user) return null;

    const { data, error: createError } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, description })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    setProjects(prev => [data as Project, ...prev]);
    return data as Project;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { data, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } as Project : p));
    return data as Project;
  };

  const deleteProject = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    return true;
  };

  return { projects, loading, error, createProject, updateProject, deleteProject, refetch: fetchProjects };
}
