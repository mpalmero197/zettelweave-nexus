-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding columns to content tables
ALTER TABLE public.zettel_cards 
ADD COLUMN IF NOT EXISTS content_embedding vector(1536);

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS content_embedding vector(1536);

-- Create indexes for faster similarity search
CREATE INDEX IF NOT EXISTS zettel_cards_embedding_idx 
ON public.zettel_cards 
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS notes_embedding_idx 
ON public.notes 
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to find similar zettel cards
CREATE OR REPLACE FUNCTION find_similar_zettel_cards(
  target_id uuid,
  similarity_threshold float DEFAULT 0.85,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_embedding vector(1536);
  target_user_id uuid;
BEGIN
  -- Get the target card's embedding and user_id
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM zettel_cards
  WHERE zettel_cards.id = target_id AND deleted_at IS NULL;
  
  IF target_embedding IS NULL THEN
    RETURN;
  END IF;
  
  -- Find similar cards
  RETURN QUERY
  SELECT 
    zc.id,
    zc.title,
    zc.content,
    zc.created_at,
    (1 - (zc.content_embedding <=> target_embedding))::float as similarity
  FROM zettel_cards zc
  WHERE zc.id != target_id
    AND zc.user_id = target_user_id
    AND zc.deleted_at IS NULL
    AND zc.content_embedding IS NOT NULL
    AND (1 - (zc.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY zc.content_embedding <=> target_embedding
  LIMIT max_results;
END;
$$;

-- Function to find similar notes
CREATE OR REPLACE FUNCTION find_similar_notes(
  target_id uuid,
  similarity_threshold float DEFAULT 0.85,
  max_results int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_embedding vector(1536);
  target_user_id uuid;
BEGIN
  -- Get the target note's embedding and user_id
  SELECT content_embedding, user_id INTO target_embedding, target_user_id
  FROM notes
  WHERE notes.id = target_id AND deleted_at IS NULL;
  
  IF target_embedding IS NULL THEN
    RETURN;
  END IF;
  
  -- Find similar notes
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.created_at,
    (1 - (n.content_embedding <=> target_embedding))::float as similarity
  FROM notes n
  WHERE n.id != target_id
    AND n.user_id = target_user_id
    AND n.deleted_at IS NULL
    AND n.content_embedding IS NOT NULL
    AND (1 - (n.content_embedding <=> target_embedding)) > similarity_threshold
  ORDER BY n.content_embedding <=> target_embedding
  LIMIT max_results;
END;
$$;