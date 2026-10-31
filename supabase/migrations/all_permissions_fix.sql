-- ====================================================================
-- AFTERTHOUGHT: Consolidated Schema & Permissions Setup (Idempotent)
-- Safely creates tables, handles existing policies, and grants permissions
-- ====================================================================

-- 1. Ensure public.entries permissions
GRANT ALL ON TABLE public.entries TO anon, authenticated;

-- 2. Ensure public.future_letters permissions
GRANT ALL ON TABLE public.future_letters TO anon, authenticated;

-- 3. Ensure Phase 7 reflections table & permissions
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
CREATE POLICY "Users can view their own reflections" ON public.reflections FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reflections" ON public.reflections;
CREATE POLICY "Users can insert their own reflections" ON public.reflections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reflections" ON public.reflections;
CREATE POLICY "Users can update their own reflections" ON public.reflections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reflections" ON public.reflections;
CREATE POLICY "Users can delete their own reflections" ON public.reflections FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.reflections TO anon, authenticated;

-- 4. Phase 8 Memory Universe Tables & Permissions
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
CREATE POLICY "Users can view their own memory entities" ON public.memory_entities FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can insert their own memory entities" ON public.memory_entities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can update their own memory entities" ON public.memory_entities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own memory entities" ON public.memory_entities;
CREATE POLICY "Users can delete their own memory entities" ON public.memory_entities FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own memory mentions" ON public.memory_mentions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can insert their own memory mentions" ON public.memory_mentions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can update their own memory mentions" ON public.memory_mentions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own memory mentions" ON public.memory_mentions;
CREATE POLICY "Users can delete their own memory mentions" ON public.memory_mentions FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own memory connections" ON public.memory_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can insert their own memory connections" ON public.memory_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can update their own memory connections" ON public.memory_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own memory connections" ON public.memory_connections;
CREATE POLICY "Users can delete their own memory connections" ON public.memory_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
CREATE POLICY "Users can view their own meaningful moments" ON public.meaningful_moments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can insert their own meaningful moments" ON public.meaningful_moments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can update their own meaningful moments" ON public.meaningful_moments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own meaningful moments" ON public.meaningful_moments;
CREATE POLICY "Users can delete their own meaningful moments" ON public.meaningful_moments FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.meaningful_moments TO anon, authenticated;
