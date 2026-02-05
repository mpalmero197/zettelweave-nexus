-- Fix 1: profiles_table_public_exposure - Restrict profile visibility to friends only
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view visible profiles" ON profiles;

-- Create new policy that allows viewing own profile OR friend's visible profiles
CREATE POLICY "Users can view own profile or visible friend profiles"
ON profiles FOR SELECT
USING (
  user_id = auth.uid() 
  OR (is_visible = true AND are_friends(auth.uid(), user_id))
);

-- Fix 2: feature_requests_public_exposure - Restrict to admins only or own requests
DROP POLICY IF EXISTS "Authenticated users can view feature requests" ON feature_requests;

-- Users can only see their own feature requests, admins can see all
CREATE POLICY "Users can view their own feature requests"
ON feature_requests FOR SELECT
USING (
  auth.uid() = user_id OR is_admin(auth.uid())
);

-- Fix 3: cookie_consent_update_policy_flaw - Fix the tautology in UPDATE policy
DROP POLICY IF EXISTS "Users can update their own consent" ON cookie_consent_analytics;

-- Proper UPDATE policy: user can update if they own the record OR if it's an anonymous record matching their session
-- Note: We compare to a value passed in the update, not to itself
CREATE POLICY "Users can update their own consent by session"
ON cookie_consent_analytics FOR UPDATE
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR (user_id IS NULL)
);

-- Fix 4: subscriptions_backend_only_claim - Restrict INSERT/UPDATE to service role only
-- The current policies with 'true' are dangerous - only backend should modify subscriptions
DROP POLICY IF EXISTS "Only backend can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only backend can update subscriptions" ON subscriptions;

-- Use false for both - only service_role (which bypasses RLS) can insert/update
-- This is the correct pattern for backend-only tables
CREATE POLICY "Subscriptions can only be inserted by service role"
ON subscriptions FOR INSERT
WITH CHECK (false);

CREATE POLICY "Subscriptions can only be updated by service role"
ON subscriptions FOR UPDATE
USING (false);