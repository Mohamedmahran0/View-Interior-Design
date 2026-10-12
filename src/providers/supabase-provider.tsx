'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from '@/i18n/routing';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User, SupabaseClient } from '@supabase/supabase-js';

type SupabaseContextType = {
  supabase: SupabaseClient;
  user: User | null;
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfileSilently = async (currentUser: User) => {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentUser.id)
          .single();

        if (!existing) {
          const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Engineer';
          const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;
          await supabase.from('profiles').insert({
            id: currentUser.id,
            email: currentUser.email!,
            full_name: fullName,
            avatar_url: avatarUrl,
            role: 'engineer',
            subscription_tier: 'free',
            credits_remaining: 5,
            status: 'active',
          });
        }
      } catch {
        // Silently ignore if table is pending
      }
    };

    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        syncProfileSilently(currentUser);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        syncProfileSilently(currentUser);
      }
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}
