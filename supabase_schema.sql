-- ============================================================================
-- NOIR WORKSPACE — Supabase Schema & Row Level Security (RLS) Setup
-- Paste and run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Create the `notes` table
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    parent_id TEXT DEFAULT NULL,
    is_main BOOLEAN NOT NULL DEFAULT false,
    cells JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if re-running script to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

-- 4. Create RLS Policies strictly bound to auth.uid()
-- SELECT: Users can only view notes belonging to their user_id
CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only insert notes with their own user_id
CREATE POLICY "Users can insert their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only modify notes with their own user_id
CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete notes with their own user_id
CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Create Performance Indexes for fast queries
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS notes_parent_id_idx ON public.notes (parent_id);

-- 6. Trigger to automatically keep updated_at in sync
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
