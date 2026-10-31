-- ====================================================================
-- AFTERTHOUGHT Phase 9: Memory Attachments & Immersive Experience
-- ====================================================================

-- 1. Create table for memory attachments metadata
CREATE TABLE IF NOT EXISTS public.entry_attachments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS entry_attachments_user_entry_idx ON public.entry_attachments (user_id, entry_id);
CREATE INDEX IF NOT EXISTS entry_attachments_created_idx ON public.entry_attachments (user_id, created_at DESC);

-- 2. Row Level Security
ALTER TABLE public.entry_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can view their own attachments" ON public.entry_attachments
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can insert their own attachments" ON public.entry_attachments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can update their own attachments" ON public.entry_attachments
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can delete their own attachments" ON public.entry_attachments
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 3. Grant table permissions to authenticated and anon
GRANT ALL ON TABLE public.entry_attachments TO anon, authenticated;

-- 4. Storage Bucket Setup (Storage bucket: diary-attachments)
-- Insert bucket into storage.buckets if storage extension exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'diary-attachments',
    'diary-attachments',
    false, -- private bucket, signed URLs only
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage bucket RLS policies for private objects
DROP POLICY IF EXISTS "Users can upload their own diary attachments" ON storage.objects;
CREATE POLICY "Users can upload their own diary attachments" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'diary-attachments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can view their own diary attachments" ON storage.objects;
CREATE POLICY "Users can view their own diary attachments" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'diary-attachments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own diary attachments" ON storage.objects;
CREATE POLICY "Users can delete their own diary attachments" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'diary-attachments' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

