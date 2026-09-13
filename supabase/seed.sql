-- ============================================================
-- VIEW INTERIOR DESIGN - SEED DATA FOR SUBSCRIPTION PLANS
-- Run this after schema.sql (or on an existing database).
-- Uses fixed UUIDs so the Paddle webhook can reliably match plans.
-- IMPORTANT: Replace the paddle_price_id_* placeholders with your
-- real Paddle price IDs (from Paddle Billing -> Catalog -> Prices).
-- ============================================================

-- Ensure new projects columns exist (idempotent for existing databases)
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS author_name TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS glb_url TEXT;

-- Ensure new Paddle columns exist (idempotent for existing databases)
ALTER TABLE public.subscription_plans
    ADD COLUMN IF NOT EXISTS paddle_price_id_monthly TEXT,
    ADD COLUMN IF NOT EXISTS paddle_price_id_yearly TEXT;

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT;

-- Drop old unique constraint if the new paddle one needs to be created
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_paddle_subscription_id_key;

-- ============================================================
-- PLANS (upsert by fixed id so re-running seed.sql is safe)
-- ============================================================
INSERT INTO public.subscription_plans (
    id, name, description, price_monthly, price_yearly, currency,
    credits_per_month, max_projects, max_storage_gb, features,
    stripe_price_id_monthly, stripe_price_id_yearly,
    paddle_price_id_monthly, paddle_price_id_yearly,
    is_active
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Free',
    'Get started with basic features',
    0, 0, 'USD',
    5, 1, 0.5,
    '{"plugin": false, "ai": false, "hdr": false, "team": false, "domain": false, "support": false}',
    NULL, NULL,
    NULL, NULL,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002',
    'Basic',
    'Perfect for individual designers',
    19, 190, 'USD',
    50, 10, 5,
    '{"plugin": true, "ai": false, "hdr": true, "team": false, "domain": false, "support": false}',
    'price_basic_monthly', 'price_basic_yearly',
    'pri_basic_monthly_replace_me', 'pri_basic_yearly_replace_me',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000003',
    'Pro',
    'For professional designers and studios',
    49, 490, 'USD',
    200, 999999, 50,
    '{"plugin": true, "ai": true, "hdr": true, "team": false, "domain": false, "support": true}',
    'price_pro_monthly', 'price_pro_yearly',
    'pri_pro_monthly_replace_me', 'pri_pro_yearly_replace_me',
    TRUE
),
(
    '00000000-0000-0000-0000-000000000004',
    'Enterprise',
    'For large teams and organizations',
    199, 1990, 'USD',
    999999, 999999, 500,
    '{"plugin": true, "ai": true, "hdr": true, "team": true, "domain": true, "support": true}',
    'price_enterprise_monthly', 'price_enterprise_yearly',
    'pri_enterprise_monthly_replace_me', 'pri_enterprise_yearly_replace_me',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    currency = EXCLUDED.currency,
    credits_per_month = EXCLUDED.credits_per_month,
    max_projects = EXCLUDED.max_projects,
    max_storage_gb = EXCLUDED.max_storage_gb,
    features = EXCLUDED.features,
    paddle_price_id_monthly = EXCLUDED.paddle_price_id_monthly,
    paddle_price_id_yearly = EXCLUDED.paddle_price_id_yearly,
    is_active = EXCLUDED.is_active;

-- ============================================================
-- MONTHLY CREDIT RESET FUNCTION
-- Resets credits_remaining to the plan's monthly allowance.
-- Called by the Paddle webhook on renewal / new subscription.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_user_credits(target_user_id UUID, plan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    allowance INTEGER;
BEGIN
    SELECT credits_per_month INTO allowance
    FROM public.subscription_plans WHERE id = plan_id;

    IF allowance IS NULL THEN
        allowance := 0;
    END IF;

    UPDATE public.profiles
    SET credits_remaining = allowance,
        credits_used = 0,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$;
