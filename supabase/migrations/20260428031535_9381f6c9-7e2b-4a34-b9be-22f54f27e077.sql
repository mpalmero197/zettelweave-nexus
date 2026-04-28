-- Singleton settings
CREATE TABLE public.seo_engine_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  categories JSONB NOT NULL DEFAULT '{"meta_tags":true,"jsonld":true,"llms_txt":true,"sitemap":true,"faq":true,"robots":false}'::jsonb,
  max_auto_per_run INTEGER NOT NULL DEFAULT 5,
  max_queued_per_run INTEGER NOT NULL DEFAULT 10,
  last_run_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.seo_engine_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Run history
CREATE TABLE public.seo_improvement_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  techniques_found INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  queued_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT,
  raw_research JSONB,
  triggered_by TEXT NOT NULL DEFAULT 'cron'
);
CREATE INDEX idx_seo_runs_started ON public.seo_improvement_runs(started_at DESC);

-- Dedup: every technique we've ever discovered
CREATE TABLE public.seo_applied_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_signature TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_url TEXT,
  category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence NUMERIC(3,2),
  run_id UUID REFERENCES public.seo_improvement_runs(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_techniques_applied ON public.seo_applied_techniques(applied_at DESC);

-- Per-route meta tag overrides (publicly readable so SEOHead can use them)
CREATE TABLE public.seo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_pattern TEXT NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('title','description','keywords','og_image','og_type','canonical')),
  value TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  source_technique_id UUID REFERENCES public.seo_applied_techniques(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_overrides_route ON public.seo_overrides(route_pattern, active);

-- Extra JSON-LD per route
CREATE TABLE public.seo_jsonld (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_pattern TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  source_technique_id UUID REFERENCES public.seo_applied_techniques(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_jsonld_route ON public.seo_jsonld(route_pattern, active);

-- Auto-added FAQ entries
CREATE TABLE public.seo_faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_pattern TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  source_technique_id UUID REFERENCES public.seo_applied_techniques(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_faq_route ON public.seo_faq_entries(route_pattern, active, sort_order);

-- Singleton llms.txt content
CREATE TABLE public.seo_llms_content (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  llms_txt TEXT NOT NULL DEFAULT '',
  llms_full_txt TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_technique_id UUID REFERENCES public.seo_applied_techniques(id) ON DELETE SET NULL
);
INSERT INTO public.seo_llms_content (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Change log for revert
CREATE TABLE public.seo_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applied_technique_id UUID REFERENCES public.seo_applied_techniques(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  row_id UUID,
  before_data JSONB,
  after_data JSONB,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_change_log_created ON public.seo_change_log(created_at DESC);

-- updated_at triggers
CREATE TRIGGER seo_engine_settings_updated BEFORE UPDATE ON public.seo_engine_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seo_overrides_updated BEFORE UPDATE ON public.seo_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seo_jsonld_updated BEFORE UPDATE ON public.seo_jsonld FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seo_faq_entries_updated BEFORE UPDATE ON public.seo_faq_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.seo_engine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_improvement_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_applied_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_jsonld ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_llms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_change_log ENABLE ROW LEVEL SECURITY;

-- Admin-only on settings, runs, techniques, change log
CREATE POLICY "Admins manage seo_engine_settings" ON public.seo_engine_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage seo_improvement_runs" ON public.seo_improvement_runs FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage seo_applied_techniques" ON public.seo_applied_techniques FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage seo_change_log" ON public.seo_change_log FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Public read for content tables (frontend uses anon key)
CREATE POLICY "Public read seo_overrides" ON public.seo_overrides FOR SELECT USING (active = true);
CREATE POLICY "Admins manage seo_overrides" ON public.seo_overrides FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public read seo_jsonld" ON public.seo_jsonld FOR SELECT USING (active = true);
CREATE POLICY "Admins manage seo_jsonld" ON public.seo_jsonld FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public read seo_faq_entries" ON public.seo_faq_entries FOR SELECT USING (active = true);
CREATE POLICY "Admins manage seo_faq_entries" ON public.seo_faq_entries FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public read seo_llms_content" ON public.seo_llms_content FOR SELECT USING (true);
CREATE POLICY "Admins manage seo_llms_content" ON public.seo_llms_content FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));