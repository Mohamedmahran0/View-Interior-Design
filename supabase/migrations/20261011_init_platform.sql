-- ============================================================
-- Migration: 20261011_init_platform.sql
-- View Interior Design Platform Schema (Prompt 1)
-- ============================================================

-- 1. PROFILES TABLE (Extends auth.users with role and subscription info)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'engineer' CHECK (role IN ('engineer', 'admin', 'viewer')),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
    credits_remaining INTEGER DEFAULT 5,
    credits_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engineer_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "engineer_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    glb_storage_path TEXT, -- Storage path: {user_id}/{project_id}/scene.glb
    model_url TEXT,
    glb_url TEXT,
    thumbnail_url TEXT,
    scene_metadata JSONB DEFAULT '{}', -- Scene settings: camera, lighting, materials
    scene_data JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    category TEXT,
    author_name TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync user_id and owner_id for full compatibility
CREATE OR REPLACE FUNCTION public.sync_project_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.owner_id := NEW.user_id;
    ELSIF NEW.user_id IS NULL AND NEW.owner_id IS NOT NULL THEN
        NEW.user_id := NEW.owner_id;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_project_owner ON public.projects;
CREATE TRIGGER trg_sync_project_owner
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.sync_project_owner();

-- Enable Row Level Security (RLS) on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Engineer views own projects
CREATE POLICY "engineer_view_own_projects" ON public.projects
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = user_id);

-- Policy: Engineer inserts own projects
CREATE POLICY "engineer_insert_own_projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() = user_id);

-- Policy: Engineer updates own projects
CREATE POLICY "engineer_update_own_projects" ON public.projects
    FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = user_id);

-- Policy: Engineer deletes own projects
CREATE POLICY "engineer_delete_own_projects" ON public.projects
    FOR DELETE USING (auth.uid() = owner_id OR auth.uid() = user_id);

-- Policy: Public access via share token or public status
CREATE POLICY "public_access_via_token" ON public.projects
    FOR SELECT USING (is_public = TRUE OR share_token IS NOT NULL);

-- 3. STORAGE BUCKET POLICIES (bucket: models)
-- Path structure: {user_id}/{project_id}/scene.glb
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to models bucket"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'models' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update in models bucket"
ON storage.objects FOR UPDATE USING (
    bucket_id = 'models' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own models or public projects"
ON storage.objects FOR SELECT USING (
    bucket_id = 'models' AND
    ((storage.foldername(name))[1] = auth.uid()::text OR
     EXISTS (
        SELECT 1 FROM public.projects 
        WHERE (is_public = TRUE OR share_token IS NOT NULL) 
        AND (glb_storage_path = name OR model_url LIKE '%' || name)
     ))
);

-- 4. NEW USER AUTOMATIC PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, subscription_tier, credits_remaining)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        'engineer',
        'free',
        5
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
