-- ============================================================
-- VIEW INTERIOR DESIGN - TUS RESUMABLE & ARCHITECTURAL STORAGE BACKEND
-- ============================================================

-- 1. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'engineer' CHECK (role IN ('engineer', 'admin', 'viewer')),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'enterprise')),
    credits_remaining INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    glb_storage_path TEXT, -- Storage path: {user_id}/{project_id}/scene.glb
    hdr_storage_path TEXT, -- Storage path: {user_id}/{project_id}/environment.hdr
    model_url TEXT,
    glb_url TEXT,
    scene_metadata JSONB DEFAULT '{"camera": {"fov": 50, "position": [0, 2, 5]}, "lighting": {"exposure": 1.1, "hdrIntensity": 1.0}}',
    settings JSONB DEFAULT '{"bakedMaterials": true, "quality": "balanced"}',
    is_public BOOLEAN DEFAULT FALSE,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to keep owner_id and user_id in sync
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

-- Enable RLS on Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Engineers view only their own projects
CREATE POLICY "engineer_view_own_projects" 
    ON public.projects FOR SELECT 
    USING (auth.uid() = owner_id);

-- Policy 2: Engineers insert their own projects
CREATE POLICY "engineer_insert_own_projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Engineers update only their own projects
CREATE POLICY "engineer_update_own_projects" 
    ON public.projects FOR UPDATE 
    USING (auth.uid() = owner_id);

-- Policy 4: Engineers delete only their own projects
CREATE POLICY "engineer_delete_own_projects" 
    ON public.projects FOR DELETE 
    USING (auth.uid() = owner_id);

-- Policy 5: Public read access via share token
CREATE POLICY "public_access_via_token" 
    ON public.projects FOR SELECT 
    USING (is_public = TRUE AND share_token IS NOT NULL);

-- 3. STORAGE BUCKET: models (for TUS Resumable & GLB/HDR storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'models',
    'models',
    TRUE,
    524288000, -- 500MB maximum limit for high-poly architectural models
    ARRAY['model/gltf-binary', 'model/gltf+json', 'image/vnd.radiance', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET 
    public = TRUE,
    file_size_limit = 524288000;

-- 4. STORAGE ROW LEVEL SECURITY (RLS) POLICIES
-- Policy: Users read/write within their own {user_id}/ prefix
CREATE POLICY "Users can upload models to own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'models' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update models in own folder"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'models' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete models in own folder"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'models' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Public read access to models bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'models');
