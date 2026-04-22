
CREATE TABLE IF NOT EXISTS public.ai_code_patches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_report_id UUID REFERENCES public.error_reports(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  original_sha TEXT,
  original_content TEXT,
  new_content TEXT NOT NULL,
  explanation TEXT NOT NULL,
  ai_model TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  branch_name TEXT,
  pr_url TEXT,
  commit_sha TEXT,
  apply_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ai_code_patches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all patches"
  ON public.ai_code_patches FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert patches"
  ON public.ai_code_patches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update patches"
  ON public.ai_code_patches FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete patches"
  ON public.ai_code_patches FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ai_code_patches_status ON public.ai_code_patches(status);
CREATE INDEX IF NOT EXISTS idx_ai_code_patches_error ON public.ai_code_patches(error_report_id);
CREATE INDEX IF NOT EXISTS idx_ai_code_patches_created ON public.ai_code_patches(created_at DESC);
