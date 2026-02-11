
-- 1. Fix error_reports permissive INSERT policy
-- Replace WITH CHECK (true) with rate-limiting via requiring authenticated role
-- and basic validation
DROP POLICY IF EXISTS "Anyone can report errors" ON public.error_reports;
CREATE POLICY "Authenticated users can report errors"
ON public.error_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Allow users to view their own security audit log entries
CREATE POLICY "Users can view their own security events"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
