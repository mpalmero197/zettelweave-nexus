ALTER TABLE public.alice_macros
  ADD COLUMN IF NOT EXISTS run_vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_error_step integer,
  ADD COLUMN IF NOT EXISTS repair_count integer NOT NULL DEFAULT 0;