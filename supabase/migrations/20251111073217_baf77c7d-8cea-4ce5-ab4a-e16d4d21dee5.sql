-- Create subscriptions table to track user subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create admin_licenses table for admin-granted free licenses
CREATE TABLE IF NOT EXISTS public.admin_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on admin_licenses
ALTER TABLE public.admin_licenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for admin_licenses
CREATE POLICY "Users can view their own license"
  ON public.admin_licenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage licenses"
  ON public.admin_licenses
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user has premium access
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is admin
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
    -- Check if user has active admin license
    WHEN EXISTS (
      SELECT 1 FROM public.admin_licenses 
      WHERE user_id = _user_id 
      AND (expires_at IS NULL OR expires_at > now())
    ) THEN true
    -- Check if user has active subscription
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = _user_id 
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN true
    ELSE false
  END;
$$;