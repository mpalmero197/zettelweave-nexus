CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.alice_episodic_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('chat','run','manual')),
  source_id TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  embedding extensions.vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alice_episodic_user ON public.alice_episodic_memory(user_id, created_at DESC);
CREATE INDEX idx_alice_episodic_embedding ON public.alice_episodic_memory
  USING hnsw (embedding extensions.vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_episodic_memory TO authenticated;
GRANT ALL ON public.alice_episodic_memory TO service_role;

ALTER TABLE public.alice_episodic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own episodic" ON public.alice_episodic_memory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own episodic" ON public.alice_episodic_memory
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own episodic" ON public.alice_episodic_memory
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own episodic" ON public.alice_episodic_memory
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.match_alice_episodic(
  query_embedding extensions.vector(384),
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.55
)
RETURNS TABLE (
  id UUID,
  summary TEXT,
  source_kind TEXT,
  source_id TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT
    m.id, m.summary, m.source_kind, m.source_id, m.tags, m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.alice_episodic_memory m
  WHERE m.user_id = auth.uid()
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) >= min_similarity
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_alice_episodic(extensions.vector, int, float) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_alice_episodic(extensions.vector, int, float) TO authenticated, service_role;