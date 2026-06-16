ALTER TABLE public.alice_macros
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_domain text,
  ADD COLUMN IF NOT EXISTS goal text;
CREATE INDEX IF NOT EXISTS idx_alice_macros_target_domain ON public.alice_macros(target_domain);