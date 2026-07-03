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
      const { data } = await supabase
        .from('user_subscriptions')
        .select('*, plan:plan_id(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (data) {
        setSubscription(data as any);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user, supabase]);

  return { subscription, loading };
}
