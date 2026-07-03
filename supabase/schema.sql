-- ============================================================
-- VIEW INTERIOR DESIGN - COMPLETE DATABASE SCHEMA
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
    credits_remaining INTEGER DEFAULT 5,
    credits_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS TABLE
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    model_url TEXT,
    thumbnail_url TEXT,
    scene_data JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{"movementSpeed": 2, "lookSpeed": 0.1}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'ready', 'archived')),
    is_public BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.project_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    command JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public projects" ON public.projects
    FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can CRUD own project history" ON public.project_history
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
    );

-- 3. SUBSCRIPTION PLANS TABLE
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    credits_per_month INTEGER,
    max_projects INTEGER,
    max_storage_gb DECIMAL(5,2),
    features JSONB,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stripe_subscription_id)
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_subscription_id UUID REFERENCES public.user_subscriptions(id),
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. ASSETS TABLES
CREATE TABLE public.asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.asset_categories(id),
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.asset_categories(id),
    model_url TEXT NOT NULL,
    thumbnail_url TEXT,
    preview_url TEXT,
    dimensions JSONB,
    tags TEXT[],
    is_premium BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view asset categories" ON public.asset_categories
    FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can view free assets" ON public.assets
    FOR SELECT USING (is_premium = FALSE);
CREATE POLICY "Premium users can view premium assets" ON public.assets
    FOR SELECT USING (
        is_premium = FALSE OR 
        EXISTS (
            SELECT 1 FROM public.user_subscriptions us
            WHERE us.user_id = auth.uid() 
            AND us.status = 'active'
            AND us.plan_id IN (
                SELECT id FROM public.subscription_plans 
                WHERE name IN ('Pro', 'Enterprise')
            )
        )
    );

-- 5. ADMIN ROLES TABLE
CREATE TABLE public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support', 'viewer')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin_roles" ON public.admin_roles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
    );

-- 6. FUNCTIONS
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, subscription_tier, credits_remaining)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        'free',
        5
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_roles WHERE user_id = $1
    );
$$;

-- 7. ADMIN RLS POLICIES
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view all projects" ON public.projects
    FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
    FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (public.is_admin(auth.uid()));

-- 8. STORAGE POLICIES
-- Buckets: projects, assets, avatars, thumbnails
CREATE POLICY "Users can upload to own project folder"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'projects' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own project files"
ON storage.objects FOR SELECT USING (
    bucket_id = 'projects' AND
    ((storage.foldername(name))[1] = auth.uid()::text OR
     EXISTS (SELECT 1 FROM public.projects WHERE model_url LIKE '%' || name))
);

-- 9. ENABLE REALTIME
-- Use Supabase dashboard or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.project_history;
