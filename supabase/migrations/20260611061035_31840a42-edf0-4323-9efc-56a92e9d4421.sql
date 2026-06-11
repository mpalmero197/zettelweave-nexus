
CREATE TABLE IF NOT EXISTS public.oauth_provider_configs (
  provider TEXT PRIMARY KEY,
  client_id TEXT,
  client_secret TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.oauth_provider_configs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_provider_configs TO authenticated;

ALTER TABLE public.oauth_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read oauth configs"
  ON public.oauth_provider_configs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert oauth configs"
  ON public.oauth_provider_configs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update oauth configs"
  ON public.oauth_provider_configs
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete oauth configs"
  ON public.oauth_provider_configs
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_oauth_provider_configs_updated_at
  BEFORE UPDATE ON public.oauth_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
