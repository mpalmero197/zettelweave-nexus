-- Create chapters table for document structure
CREATE TABLE IF NOT EXISTS public.catalyst_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.catalyst_chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create citations table
CREATE TABLE IF NOT EXISTS public.catalyst_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  citation_type TEXT NOT NULL, -- 'book', 'article', 'website', 'journal', etc.
  authors JSONB DEFAULT '[]',
  title TEXT NOT NULL,
  publication_year INTEGER,
  publisher TEXT,
  url TEXT,
  doi TEXT,
  pages TEXT,
  volume TEXT,
  issue TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create writing goals table
CREATE TABLE IF NOT EXISTS public.catalyst_writing_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.catalyst_chapters(id) ON DELETE CASCADE,
  target_words INTEGER NOT NULL,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.catalyst_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalyst_writing_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapters
CREATE POLICY "Users can view their own chapters"
  ON public.catalyst_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chapters"
  ON public.catalyst_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapters"
  ON public.catalyst_chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapters"
  ON public.catalyst_chapters FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for citations
CREATE POLICY "Users can view their own citations"
  ON public.catalyst_citations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own citations"
  ON public.catalyst_citations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own citations"
  ON public.catalyst_citations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own citations"
  ON public.catalyst_citations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for writing goals
CREATE POLICY "Users can view their own writing goals"
  ON public.catalyst_writing_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own writing goals"
  ON public.catalyst_writing_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own writing goals"
  ON public.catalyst_writing_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own writing goals"
  ON public.catalyst_writing_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_catalyst_chapters_document ON public.catalyst_chapters(document_id);
CREATE INDEX idx_catalyst_chapters_parent ON public.catalyst_chapters(parent_id);
CREATE INDEX idx_catalyst_citations_document ON public.catalyst_citations(document_id);
CREATE INDEX idx_catalyst_writing_goals_document ON public.catalyst_writing_goals(document_id);

-- Add trigger for updated_at
CREATE TRIGGER update_catalyst_chapters_updated_at
  BEFORE UPDATE ON public.catalyst_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalyst_citations_updated_at
  BEFORE UPDATE ON public.catalyst_citations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_catalyst_writing_goals_updated_at
  BEFORE UPDATE ON public.catalyst_writing_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();