
CREATE TABLE public.quiz_funnel_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  usage_duration TEXT,
  satisfaction TEXT,
  priorities TEXT[] DEFAULT '{}',
  coupon_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_funnel_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz leads"
ON public.quiz_funnel_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can view quiz leads"
ON public.quiz_funnel_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
