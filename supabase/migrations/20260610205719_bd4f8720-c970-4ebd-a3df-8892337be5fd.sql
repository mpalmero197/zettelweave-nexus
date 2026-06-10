CREATE TABLE IF NOT EXISTS public.alice_macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_url text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alice_macros_user_idx ON public.alice_macros(user_id);
CREATE INDEX IF NOT EXISTS alice_macros_name_idx ON public.alice_macros(user_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_macros TO authenticated;
GRANT ALL ON public.alice_macros TO service_role;

ALTER TABLE public.alice_macros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own macros" ON public.alice_macros FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own macros" ON public.alice_macros FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner can update own macros" ON public.alice_macros FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner can delete own macros" ON public.alice_macros FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER alice_macros_touch_updated_at BEFORE UPDATE ON public.alice_macros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.alice_macro_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  macro_id uuid NOT NULL REFERENCES public.alice_macros(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  current_step integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 0,
  error text,
  screenshot_path text,
  initiated_by text NOT NULL DEFAULT 'user',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS alice_macro_runs_user_idx ON public.alice_macro_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS alice_macro_runs_macro_idx ON public.alice_macro_runs(macro_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_macro_runs TO authenticated;
GRANT ALL ON public.alice_macro_runs TO service_role;

ALTER TABLE public.alice_macro_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own macro runs" ON public.alice_macro_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner inserts own macro runs" ON public.alice_macro_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates own macro runs" ON public.alice_macro_runs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner deletes own macro runs" ON public.alice_macro_runs FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.alice_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  trigger_phrase text,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alice_workflows_user_idx ON public.alice_workflows(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_workflows TO authenticated;
GRANT ALL ON public.alice_workflows TO service_role;

ALTER TABLE public.alice_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own workflows" ON public.alice_workflows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner inserts own workflows" ON public.alice_workflows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner updates own workflows" ON public.alice_workflows FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner deletes own workflows" ON public.alice_workflows FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER alice_workflows_touch_updated_at BEFORE UPDATE ON public.alice_workflows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'alice_macro_runs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.alice_macro_runs';
  END IF;
END $$;

ALTER TABLE public.alice_macro_runs REPLICA IDENTITY FULL;