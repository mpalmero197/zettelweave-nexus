ALTER TABLE public.alice_macros
  ADD COLUMN IF NOT EXISTS trigger jsonb NOT NULL DEFAULT '{"type":"manual"}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification jsonb NOT NULL DEFAULT '{"type":"none"}'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_offsets integer[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS run_mode text NOT NULL DEFAULT 'foreground',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'alice';

CREATE INDEX IF NOT EXISTS alice_macros_trigger_type_idx ON public.alice_macros ((trigger->>'type'));