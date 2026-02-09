
-- Version snapshots for Catalyst documents
CREATE TABLE public.catalyst_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Snapshot',
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalyst_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON public.catalyst_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshots"
  ON public.catalyst_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON public.catalyst_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Add status column to catalyst_chapters
ALTER TABLE public.catalyst_chapters
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Add comments/annotations table
CREATE TABLE public.catalyst_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  anchor_text TEXT,
  position_start INTEGER,
  position_end INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalyst_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own comments"
  ON public.catalyst_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comments"
  ON public.catalyst_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.catalyst_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.catalyst_comments FOR DELETE
  USING (auth.uid() = user_id);
