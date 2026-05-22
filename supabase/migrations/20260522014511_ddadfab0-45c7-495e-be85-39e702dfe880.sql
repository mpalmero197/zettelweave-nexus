ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_search_engine TEXT NOT NULL DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS alice_proactive_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alice_proactive_level INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.profiles
  ADD CONSTRAINT preferred_search_engine_check
  CHECK (preferred_search_engine IN ('google','duckduckgo'));

-- ALICE proactive pulses surfaced to the user
CREATE TABLE IF NOT EXISTS public.alice_pulses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ,
  CONSTRAINT alice_pulses_status_check CHECK (status IN ('pending','seen','acted','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_alice_pulses_user_status ON public.alice_pulses(user_id, status, created_at DESC);

ALTER TABLE public.alice_pulses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pulses" ON public.alice_pulses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own pulses" ON public.alice_pulses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pulses" ON public.alice_pulses
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts pulses" ON public.alice_pulses
  FOR INSERT WITH CHECK (true);