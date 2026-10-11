-- ============================================================
-- UE5 PIXEL STREAMING & DATASMITH ARCHITECTURAL EXTENSION
-- ============================================================

-- 1. DESIGNER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.designer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'studio')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on designer_profiles
ALTER TABLE public.designer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers can view own profile" 
    ON public.designer_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Designers can update own profile" 
    ON public.designer_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. EXPAND PROJECTS TABLE FOR UE5 STREAMING & DATASMITH
DO $$
BEGIN
    -- Add source_datasmith_path if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'source_datasmith_path') THEN
        ALTER TABLE public.projects ADD COLUMN source_datasmith_path TEXT;
    END IF;

    -- Add source_glb_path if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'source_glb_path') THEN
        ALTER TABLE public.projects ADD COLUMN source_glb_path TEXT;
    END IF;

    -- Add ue_project_path if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'ue_project_path') THEN
        ALTER TABLE public.projects ADD COLUMN ue_project_path TEXT;
    END IF;

    -- Add streaming_enabled flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'streaming_enabled') THEN
        ALTER TABLE public.projects ADD COLUMN streaming_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add access_password
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'access_password') THEN
        ALTER TABLE public.projects ADD COLUMN access_password TEXT;
    END IF;

    -- Add last_viewed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'last_viewed_at') THEN
        ALTER TABLE public.projects ADD COLUMN last_viewed_at TIMESTAMPTZ;
    END IF;

    -- Add designer_id alias/fallback
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'designer_id') THEN
        ALTER TABLE public.projects ADD COLUMN designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. STREAMING SESSIONS TABLE (GPU Cloud Instance Scheduling)
CREATE TABLE IF NOT EXISTS public.streaming_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_id TEXT,             -- e.g. aws-g4dn-worker-01
    signaling_url TEXT,           -- wss://signaling.viewinteriordesign.com:8888
    status TEXT DEFAULT 'initiating' CHECK (status IN ('initiating', 'active', 'ended', 'failed')),
    user_ip INET,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    connection_quality JSONB DEFAULT '{"avg_latency_ms": 45, "fps": 60, "packet_loss": 0.001}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on streaming_sessions
ALTER TABLE public.streaming_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own streaming sessions"
    ON public.streaming_sessions FOR SELECT
    USING (auth.uid() = designer_id);

CREATE POLICY "Users insert own streaming sessions"
    ON public.streaming_sessions FOR INSERT
    WITH CHECK (auth.uid() = designer_id);

-- 4. STORAGE BUCKETS FOR DATASMITH SOURCES AND BUILDS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('sources', 'sources', FALSE, 1073741824, ARRAY['application/octet-stream', 'application/zip', 'text/xml']),
    ('builds', 'builds', FALSE, 5368709120, ARRAY['application/octet-stream', 'application/zip']),
    ('thumbnails', 'thumbnails', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit;

-- 5. STORAGE POLICIES FOR SOURCES & BUILDS
CREATE POLICY "Users manage own Datasmith sources"
    ON storage.objects FOR ALL
    USING (bucket_id = 'sources' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access to thumbnails"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'thumbnails');
