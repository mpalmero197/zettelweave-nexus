ALTER TABLE public.platform_insights
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS utility_score integer,
  ADD COLUMN IF NOT EXISTS recommendation text;