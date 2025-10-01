-- Drop the insecure audit log INSERT policy that allows any authenticated user to insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- Create a restrictive policy that prevents direct user inserts
-- Only SECURITY DEFINER functions (like log_security_event) can insert
CREATE POLICY "Only system functions can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Add a comment explaining the security model
COMMENT ON POLICY "Only system functions can insert audit logs" ON public.security_audit_log IS 
'Prevents direct user inserts to audit log. Only SECURITY DEFINER functions can write audit entries, ensuring log integrity.';