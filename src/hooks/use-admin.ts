'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useEffect, useState } from 'react';
import type { AdminRole } from '@/types/database';

export function useAdmin() {
  const { supabase, user } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole['role'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsAdmin(true);
        setAdminRole(data.role as AdminRole['role']);
      } else {
        setIsAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [user, supabase]);

  return { isAdmin, adminRole, loading };
}
