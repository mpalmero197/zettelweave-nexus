-- Fix: Restrict UPDATE policy on cookie_consent_analytics to only allow
-- authenticated users to update their own records (no anonymous fallback)
DROP POLICY IF EXISTS "Users can update their own consent by session" ON public.cookie_consent_analytics;

CREATE POLICY "Users can update their own consent by session"
ON public.cookie_consent_analytics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);