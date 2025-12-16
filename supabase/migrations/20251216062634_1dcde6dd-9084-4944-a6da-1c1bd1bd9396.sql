-- Create table for cookie consent analytics
CREATE TABLE public.cookie_consent_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  functional boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  user_agent text,
  country text,
  device_type text,
  browser text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_cookie_consent_created_at ON public.cookie_consent_analytics(created_at);
CREATE INDEX idx_cookie_consent_session ON public.cookie_consent_analytics(session_id);

-- Enable RLS
ALTER TABLE public.cookie_consent_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for anonymous users too)
CREATE POLICY "Anyone can insert cookie consent"
ON public.cookie_consent_analytics
FOR INSERT
WITH CHECK (true);

-- Allow users to update their own consent
CREATE POLICY "Users can update their own consent"
ON public.cookie_consent_analytics
FOR UPDATE
USING (session_id = session_id);

-- Only admins can view all consent data
CREATE POLICY "Admins can view all cookie consent"
ON public.cookie_consent_analytics
FOR SELECT
USING (is_admin(auth.uid()));