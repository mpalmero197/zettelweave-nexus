
CREATE TABLE public.alice_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'awaiting_approval',
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_url TEXT,
  current_tab_id INTEGER,
  paused_reason TEXT,
  error TEXT,
  step_count INTEGER NOT NULL DEFAULT 0,
  max_steps INTEGER NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_agent_runs TO authenticated;
GRANT ALL ON public.alice_agent_runs TO service_role;

ALTER TABLE public.alice_agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own agent runs"
  ON public.alice_agent_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER alice_agent_runs_updated_at
  BEFORE UPDATE ON public.alice_agent_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_alice_agent_runs_user_status ON public.alice_agent_runs(user_id, status, updated_at DESC);
