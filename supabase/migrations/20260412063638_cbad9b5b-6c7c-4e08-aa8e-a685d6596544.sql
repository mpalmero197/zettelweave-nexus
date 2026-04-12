CREATE TABLE public.platform_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium',
  competitor_reference text,
  status text DEFAULT 'new',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.platform_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insights"
  ON public.platform_insights FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));