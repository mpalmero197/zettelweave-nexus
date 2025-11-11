-- Create domain management table for email domain blocking
CREATE TABLE IF NOT EXISTS public.domain_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('banned', 'allowed')),
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domain_restrictions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage domain restrictions
CREATE POLICY "Admins can manage domain restrictions"
  ON public.domain_restrictions
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Create index for faster domain lookups
CREATE INDEX idx_domain_restrictions_domain ON public.domain_restrictions(domain);
CREATE INDEX idx_domain_restrictions_type ON public.domain_restrictions(restriction_type);

-- Function to check if a domain is banned
CREATE OR REPLACE FUNCTION public.is_domain_banned(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Extract domain from email
  email_domain := LOWER(SPLIT_PART(email_address, '@', 2));
  
  -- Check if domain is explicitly banned
  RETURN EXISTS (
    SELECT 1
    FROM public.domain_restrictions
    WHERE LOWER(domain) = email_domain
    AND restriction_type = 'banned'
  );
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_domain_restrictions_updated_at
  BEFORE UPDATE ON public.domain_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();