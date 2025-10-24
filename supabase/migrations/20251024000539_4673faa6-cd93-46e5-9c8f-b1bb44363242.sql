-- Add RLS policies for security_audit_log table
-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.security_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert audit logs (via security definer function log_security_event)
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);