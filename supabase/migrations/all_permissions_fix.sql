-- ====================================================================
-- AFTERTHOUGHT: Complete All-in-One Database Setup & Permissions Fix
-- Idempotent: Can be run multiple times safely without errors
-- Covers Phases 6, 7, 8, and 9 (All Tables, RLS, Grants & Storage)
-- ====================================================================

-- 1. BASE ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    attachments TEXT[] NOT NULL DEFAULT '{}'
);

-- Ensure column entry_date exists even if an earlier table was created differently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'entries' AND column_name = 'entry_date'
    ) THEN
        ALTER TABLE public.entries ADD COLUMN entry_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS entries_user_id_idx ON public.entries (user_id);
CREATE INDEX IF NOT EXISTS entries_user_entry_date_idx ON public.entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS entries_user_created_at_idx ON public.entries (user_id, created_at DESC);

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own entries" ON public.entries;
CREATE POLICY "Users can view their own entries" ON public.entries
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own entries" ON public.entries;
CREATE POLICY "Users can insert their own entries" ON public.entries
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON public.entries;
CREATE POLICY "Users can update their own entries" ON public.entries
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own entries" ON public.entries;
CREATE POLICY "Users can delete their own entries" ON public.entries
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.entries TO anon, authenticated;


-- 2. FUTURE LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.future_letters (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    scheduled_open_at DATE NOT NULL DEFAULT CURRENT_DATE,
    opened_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('draft', 'sealed', 'opened', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS future_letters_user_id_idx ON public.future_letters (user_id);
CREATE INDEX IF NOT EXISTS future_letters_user_scheduled_idx ON public.future_letters (user_id, scheduled_open_at ASC);

ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own letters" ON public.future_letters;
CREATE POLICY "Users can view their own letters" ON public.future_letters
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own letters" ON public.future_letters;
CREATE POLICY "Users can insert their own letters" ON public.future_letters
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own letters" ON public.future_letters;
CREATE POLICY "Users can update their own letters" ON public.future_letters
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own letters" ON public.future_letters;
CREATE POLICY "Users can delete their own letters" ON public.future_letters
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.future_letters TO anon, authenticated;


-- 3. PHASE 7: REFLECTIONS TABLE
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
CREATE POLICY "Users can view their own reflections" ON public.reflections
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reflections" ON public.reflections;
CREATE POLICY "Users can insert their own reflections" ON public.reflections
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reflections" ON public.reflections;
CREATE POLICY "Users can update their own reflections" ON public.reflections
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reflections" ON public.reflections;
CREATE POLICY "Users can delete their own reflections" ON public.reflections
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.reflections TO anon, authenticated;


-- 4. PHASE 8: MEMORY UNIVERSE TABLES
CREATE TABLE IF NOT EXISTS public.memory_entities (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'place', 'topic', 'project')),
    display_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    confirmation_status TEXT NOT NULL DEFAULT 'suggested' CHECK (confirmation_status IN ('suggested', 'confirmed', 'dismissed')),
    relationship_label TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_memory_entity_user_type_name UNIQUE (user_id, entity_type, normalized_name)
);

CREATE INDEX IF NOT EXISTS memory_entities_user_type_idx ON public.memory_entities (user_id, entity_type);
CREATE INDEX IF NOT EXISTS memory_entities_user_status_idx ON public.memory_entities (user_id, confirmation_status);

ALTER TABLE public.memory_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can view their own memory entities" ON public.memory_entities
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can insert their own memory entities" ON public.memory_entities
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can update their own memory entities" ON public.memory_entities
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can delete their own memory entities" ON public.memory_entities
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.memory_entities TO anon, authenticated;


CREATE TABLE IF NOT EXISTS public.memory_mentions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES public.memory_entities(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    excerpt TEXT,
    confidence REAL NOT NULL DEFAULT 0.8,
    confirmation_status TEXT NOT NULL DEFAULT 'suggested' CHECK (confirmation_status IN ('suggested', 'confirmed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_memory_mention_user_entry_entity UNIQUE (user_id, entry_id, entity_id)
);

CREATE INDEX IF NOT EXISTS memory_mentions_user_entry_idx ON public.memory_mentions (user_id, entry_id);
CREATE INDEX IF NOT EXISTS memory_mentions_user_entity_idx ON public.memory_mentions (user_id, entity_id);

ALTER TABLE public.memory_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can view their own memory mentions" ON public.memory_mentions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can insert their own memory mentions" ON public.memory_mentions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can update their own memory mentions" ON public.memory_mentions
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can delete their own memory mentions" ON public.memory_mentions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.memory_mentions TO anon, authenticated;


CREATE TABLE IF NOT EXISTS public.memory_connections (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_entry_id TEXT NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    target_entry_id TEXT NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL DEFAULT 'theme',
    explanation TEXT NOT NULL,
    supporting_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    origin TEXT NOT NULL CHECK (origin IN ('ai', 'heuristic', 'user')),
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS memory_connections_user_source_idx ON public.memory_connections (user_id, source_entry_id);
CREATE INDEX IF NOT EXISTS memory_connections_user_target_idx ON public.memory_connections (user_id, target_entry_id);
CREATE INDEX IF NOT EXISTS memory_connections_user_status_idx ON public.memory_connections (user_id, status);

ALTER TABLE public.memory_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can view their own memory connections" ON public.memory_connections
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can insert their own memory connections" ON public.memory_connections
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can update their own memory connections" ON public.memory_connections
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can delete their own memory connections" ON public.memory_connections
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.memory_connections TO anon, authenticated;


CREATE TABLE IF NOT EXISTS public.meaningful_moments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_meaningful_moment_user_entry UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS meaningful_moments_user_entry_idx ON public.meaningful_moments (user_id, entry_id);

ALTER TABLE public.meaningful_moments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can view their own meaningful moments" ON public.meaningful_moments
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can insert their own meaningful moments" ON public.meaningful_moments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can update their own meaningful moments" ON public.meaningful_moments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can delete their own meaningful moments" ON public.meaningful_moments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.meaningful_moments TO anon, authenticated;


-- 5. PHASE 9: MEMORY ATTACHMENTS TABLE
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

ALTER TABLE public.entry_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can view their own attachments" ON public.entry_attachments
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can insert their own attachments" ON public.entry_attachments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can update their own attachments" ON public.entry_attachments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.entry_attachments;
CREATE POLICY "Users can delete their own attachments" ON public.entry_attachments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.entry_attachments TO anon, authenticated;
