-- Fix 1: Profiles table - restrict to authenticated users only
DROP POLICY IF EXISTS "Profiles are visible to everyone when is_visible is true" ON public.profiles;
DROP POLICY IF EXISTS "Users can view visible profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

-- Only authenticated users can view profiles where is_visible is true
CREATE POLICY "Authenticated users can view visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_visible = true OR user_id = auth.uid());

-- Fix 2: Feature requests - restrict to authenticated users
DROP POLICY IF EXISTS "Users can view all feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Anyone can view feature requests" ON public.feature_requests;

CREATE POLICY "Authenticated users can view feature requests"
ON public.feature_requests
FOR SELECT
TO authenticated
USING (true);

-- Fix 3: Cookie consent analytics - fix weak UPDATE policy
DROP POLICY IF EXISTS "Users can update their own cookie consent" ON public.cookie_consent_analytics;

-- Immutable consent records - remove UPDATE capability entirely for compliance
-- (If updates are needed, they should create a new record with updated preferences)

-- Fix 4: Security audit log - remove conflicting policies
DROP POLICY IF EXISTS "Users cannot read audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.security_audit_log;

-- Keep only admin access to audit logs for security
-- Admins can view all logs policy should remain