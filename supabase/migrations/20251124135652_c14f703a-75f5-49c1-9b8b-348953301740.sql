-- Fix subscription table RLS policies to prevent privilege escalation
-- Drop the overly permissive policies that allow any authenticated user to modify subscriptions
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

-- Create secure policies that only allow service_role (backend/edge functions) to manage subscriptions
-- This prevents users from granting themselves premium access without payment

-- Only backend edge functions can create subscription records
CREATE POLICY "Only backend can insert subscriptions"
  ON public.subscriptions 
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only backend edge functions can update subscription records
CREATE POLICY "Only backend can update subscriptions"
  ON public.subscriptions 
  FOR UPDATE
  TO service_role
  USING (true);

-- Users can still view their own subscription (existing policy remains)
-- This policy already exists: "Users can view their own subscription"