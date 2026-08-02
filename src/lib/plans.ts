import { createClient } from '@supabase/supabase-js';
import { PLANS, CREDITS, MAX_PROJECTS } from './constants';

export interface PlanWithFallback {
  name: string;
  price_monthly: number;
  price_yearly: number;
  credits_per_month: number;
  max_projects: number;
  max_storage_gb: number;
  paddle_price_id_monthly?: string | null;
  paddle_price_id_yearly?: string | null;
}

const FALLBACK: Record<string, PlanWithFallback> = {
  free: {
    name: 'Free',
    price_monthly: PLANS.FREE.price,
    price_yearly: PLANS.FREE.price,
    credits_per_month: CREDITS.FREE,
    max_projects: MAX_PROJECTS.FREE,
    max_storage_gb: PLANS.FREE.storageGB,
  },
  basic: {
    name: 'Basic',
    price_monthly: PLANS.BASIC.price,
    price_yearly: PLANS.BASIC.price * 10,
    credits_per_month: CREDITS.BASIC,
    max_projects: MAX_PROJECTS.BASIC,
    max_storage_gb: PLANS.BASIC.storageGB,
  },
  pro: {
    name: 'Pro',
    price_monthly: PLANS.PRO.price,
    price_yearly: PLANS.PRO.price * 10,
    credits_per_month: CREDITS.PRO,
    max_projects: MAX_PROJECTS.PRO,
    max_storage_gb: PLANS.PRO.storageGB,
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: PLANS.ENTERPRISE.price,
    price_yearly: PLANS.ENTERPRISE.price * 10,
    credits_per_month: CREDITS.ENTERPRISE,
    max_projects: MAX_PROJECTS.ENTERPRISE,
    max_storage_gb: PLANS.ENTERPRISE.storageGB,
  },
};

function normalize(raw: any): PlanWithFallback {
  const key = String(raw.name || '').toLowerCase().trim() as keyof typeof FALLBACK;
  const fb = FALLBACK[key] || FALLBACK.free;
  return {
    name: raw.name || fb.name,
    price_monthly: raw.price_monthly != null ? Number(raw.price_monthly) : fb.price_monthly,
    price_yearly: raw.price_yearly != null ? Number(raw.price_yearly) : fb.price_yearly,
    credits_per_month:
      raw.credits_per_month != null ? Number(raw.credits_per_month) : fb.credits_per_month,
    max_projects: raw.max_projects != null ? Number(raw.max_projects) : fb.max_projects,
    max_storage_gb:
      raw.max_storage_gb != null ? Number(raw.max_storage_gb) : fb.max_storage_gb,
    paddle_price_id_monthly: raw.paddle_price_id_monthly ?? null,
    paddle_price_id_yearly: raw.paddle_price_id_yearly ?? null,
  };
}

/**
 * Fetch active subscription plans from Supabase.
 * Falls back to constants if the DB is unreachable or empty.
 */
export async function getPlans(): Promise<Record<string, PlanWithFallback>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return FALLBACK;

  try {
    const client = createClient(url, serviceKey || key);
    const { data, error } = await client
      .from('subscription_plans')
      .select(
        'name, price_monthly, price_yearly, credits_per_month, max_projects, max_storage_gb, paddle_price_id_monthly, paddle_price_id_yearly'
      )
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error || !data || data.length === 0) return FALLBACK;

    const result: Record<string, PlanWithFallback> = {};
    for (const row of data) {
      const normalized = normalize(row);
      result[normalized.name.toLowerCase()] = normalized;
    }
    // Ensure all four tiers exist even if DB is missing one
    for (const key of Object.keys(FALLBACK)) {
      if (!result[key]) result[key] = FALLBACK[key];
    }
    return result;
  } catch (err) {
    console.error('getPlans failed, using fallback:', err);
    return FALLBACK;
  }
}

export function isPlanUnlimited(maxProjects: number | undefined | null): boolean {
  return maxProjects != null && maxProjects >= 999999;
}
