'use client';

import { useSupabase } from '@/providers/supabase-provider';
import { useEffect, useState } from 'react';
import type { UserSubscription, SubscriptionPlan } from '@/types/database';

export function useSubscription() {
  const { supabase, user } = useSupabase();
  const [subscription, setSubscription] = useState<(UserSubscription & { plan: SubscriptionPlan }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, plan:plan_id(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load subscription:', error);
      }

      if (data) {
        setSubscription(data as any);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user, supabase]);

  return { subscription, loading };
}
