
-- Submissions
CREATE TABLE public.macro_marketplace_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macro_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','removed')),
  title text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  start_url text NOT NULL,
  target_domain text,
  steps_snapshot jsonb NOT NULL,
  rejection_reason text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.macro_marketplace_submissions TO authenticated;
GRANT ALL ON public.macro_marketplace_submissions TO service_role;
ALTER TABLE public.macro_marketplace_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view approved" ON public.macro_marketplace_submissions
  FOR SELECT TO authenticated USING (status = 'approved' OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Owners can submit" ON public.macro_marketplace_submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners update pending, admins update any" ON public.macro_marketplace_submissions
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.is_admin(auth.uid()))
  WITH CHECK ((user_id = auth.uid() AND status = 'pending') OR public.is_admin(auth.uid()));

CREATE INDEX idx_mms_status ON public.macro_marketplace_submissions(status);
CREATE INDEX idx_mms_user ON public.macro_marketplace_submissions(user_id);
CREATE INDEX idx_mms_tags ON public.macro_marketplace_submissions USING gin(tags);

CREATE TRIGGER trg_mms_updated BEFORE UPDATE ON public.macro_marketplace_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ratings
CREATE TABLE public.macro_marketplace_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.macro_marketplace_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.macro_marketplace_ratings TO authenticated;
GRANT ALL ON public.macro_marketplace_ratings TO service_role;
ALTER TABLE public.macro_marketplace_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed reads ratings" ON public.macro_marketplace_ratings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own ratings" ON public.macro_marketplace_ratings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_mmr_updated BEFORE UPDATE ON public.macro_marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Installs
CREATE TABLE public.macro_marketplace_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.macro_marketplace_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  installed_macro_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.macro_marketplace_installs TO authenticated;
GRANT ALL ON public.macro_marketplace_installs TO service_role;
ALTER TABLE public.macro_marketplace_installs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own installs" ON public.macro_marketplace_installs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users record own installs" ON public.macro_marketplace_installs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_mmi_submission ON public.macro_marketplace_installs(submission_id);

-- Aggregated public view
CREATE OR REPLACE VIEW public.macro_marketplace_public AS
SELECT
  s.id,
  s.macro_id,
  s.user_id AS author_id,
  s.title,
  s.description,
  s.tags,
  s.start_url,
  s.target_domain,
  s.steps_snapshot,
  s.submitted_at,
  s.reviewed_at,
  COALESCE(AVG(r.stars), 0)::float AS avg_rating,
  COUNT(DISTINCT r.id)::int AS rating_count,
  (SELECT COUNT(*) FROM public.macro_marketplace_installs i WHERE i.submission_id = s.id)::int AS install_count,
  jsonb_array_length(s.steps_snapshot) AS step_count
FROM public.macro_marketplace_submissions s
LEFT JOIN public.macro_marketplace_ratings r ON r.submission_id = s.id
WHERE s.status = 'approved'
GROUP BY s.id;

GRANT SELECT ON public.macro_marketplace_public TO authenticated, anon;
