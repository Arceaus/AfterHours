-- AFTERTHOUGHT: Phase 7 Database Migration
-- PostgreSQL schema for saved reflections and Row Level Security (RLS)

CREATE TABLE IF NOT EXISTS public.reflections (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reflection_type TEXT NOT NULL CHECK (reflection_type IN ('question', 'perspective', 'monthly', 'pattern', 'connection')),
    title TEXT NOT NULL DEFAULT '',
    query TEXT NOT NULL DEFAULT '',
    date_range_start DATE,
    date_range_end DATE,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    referenced_entry_ids TEXT[] NOT NULL DEFAULT '{}',
    used_ai BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS reflections_user_created_idx ON public.reflections (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reflections_user_type_idx ON public.reflections (user_id, reflection_type);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reflections" ON public.reflections;
CREATE POLICY "Users can view their own reflections"
    ON public.reflections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reflections" ON public.reflections;
CREATE POLICY "Users can insert their own reflections"
    ON public.reflections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reflections" ON public.reflections;
CREATE POLICY "Users can update their own reflections"
    ON public.reflections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reflections" ON public.reflections;
CREATE POLICY "Users can delete their own reflections"
    ON public.reflections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON TABLE public.reflections TO anon, authenticated;
