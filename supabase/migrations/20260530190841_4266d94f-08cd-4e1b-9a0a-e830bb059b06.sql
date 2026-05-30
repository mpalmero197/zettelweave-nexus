CREATE TABLE public.alice_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal TEXT NOT NULL,
  instructions TEXT,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  result TEXT,
  error TEXT,
  step_count INT NOT NULL DEFAULT 0,
  max_steps INT NOT NULL DEFAULT 12,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alice_runs_user ON public.alice_runs(user_id, created_at DESC);
CREATE INDEX idx_alice_runs_due ON public.alice_runs(status, next_run_at) WHERE status IN ('pending','running');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_runs TO authenticated;
GRANT ALL ON public.alice_runs TO service_role;

ALTER TABLE public.alice_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own runs" ON public.alice_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own runs" ON public.alice_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own runs" ON public.alice_runs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own runs" ON public.alice_runs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER alice_runs_updated_at
  BEFORE UPDATE ON public.alice_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();