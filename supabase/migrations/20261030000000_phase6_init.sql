-- AFTERTHOUGHT: Phase 6 Database Migration
-- PostgreSQL schema for diary entries, future letters, and Row Level Security (RLS)

-- 1. Create table: entries
CREATE TABLE IF NOT EXISTS public.entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    entry_date DATE NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    attachments TEXT[] NOT NULL DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED
);

-- Indexes for entries
CREATE INDEX IF NOT EXISTS entries_user_entry_date_idx ON public.entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS entries_user_created_at_idx ON public.entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entries_search_vector_idx ON public.entries USING GIN (search_vector);

-- 2. Create table: future_letters
CREATE TABLE IF NOT EXISTS public.future_letters (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    scheduled_open_at DATE NOT NULL,
    opened_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('draft', 'sealed', 'opened', 'cancelled'))
);

-- Indexes for future_letters
CREATE INDEX IF NOT EXISTS future_letters_user_scheduled_idx ON public.future_letters (user_id, scheduled_open_at ASC);
CREATE INDEX IF NOT EXISTS future_letters_user_created_at_idx ON public.future_letters (user_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: entries (strictly user-scoped)
CREATE POLICY "Users can view their own entries"
    ON public.entries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
    ON public.entries
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
    ON public.entries
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
    ON public.entries
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. RLS Policies: future_letters (strictly user-scoped)
CREATE POLICY "Users can view their own letters"
    ON public.future_letters
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own letters"
    ON public.future_letters
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own letters"
    ON public.future_letters
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own letters"
    ON public.future_letters
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. RPC: Purge current user's archive (called during account deletion)
CREATE OR REPLACE FUNCTION public.delete_user_archive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.entries WHERE user_id = auth.uid();
    DELETE FROM public.future_letters WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_archive() TO authenticated;

-- 7. Table Permissions for authenticated users (enforced by RLS above)
GRANT ALL ON TABLE public.entries TO authenticated;
GRANT ALL ON TABLE public.future_letters TO authenticated;


