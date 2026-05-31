CREATE OR REPLACE FUNCTION public.match_alice_episodic_for_user(
  target_user uuid,
  query_embedding extensions.vector,
  match_count integer DEFAULT 5,
  min_similarity double precision DEFAULT 0.5
)
RETURNS TABLE(id uuid, summary text, source_kind text, source_id text, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT m.id, m.summary, m.source_kind, m.source_id,
         1 - (m.embedding <=> query_embedding) AS similarity
  FROM public.alice_episodic_memory m
  WHERE m.user_id = target_user
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) >= min_similarity
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_alice_episodic_for_user(uuid, extensions.vector, integer, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_alice_episodic_for_user(uuid, extensions.vector, integer, double precision) TO service_role;