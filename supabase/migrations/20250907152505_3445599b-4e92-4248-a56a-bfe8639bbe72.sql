-- Fix security linter warnings by setting search_path on functions

-- Drop and recreate functions with proper search_path settings
DROP FUNCTION IF EXISTS public.validate_password_strength(TEXT);
DROP FUNCTION IF EXISTS public.log_security_event(UUID, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs();

-- Recreate password validation function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Minimum 8 characters
  IF LENGTH(password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long';
  END IF;
  
  -- Must contain uppercase
  IF password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'Password must contain at least one uppercase letter';
  END IF;
  
  -- Must contain lowercase
  IF password !~ '[a-z]' THEN
    RAISE EXCEPTION 'Password must contain at least one lowercase letter';
  END IF;
  
  -- Must contain numbers
  IF password !~ '[0-9]' THEN
    RAISE EXCEPTION 'Password must contain at least one number';
  END IF;
  
  -- Must contain special characters
  IF password !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'Password must contain at least one special character';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Recreate log security event function with secure search_path
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id, 
        event_type, 
        event_details, 
        ip_address, 
        user_agent
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_details,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Recreate cleanup function with secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.security_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Also fix the existing update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update comments
COMMENT ON FUNCTION public.validate_password_strength IS 'Validates password meets security requirements (search_path secured)';
COMMENT ON FUNCTION public.log_security_event IS 'Logs security events with user context (search_path secured)';
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Removes audit logs older than 90 days (search_path secured)';
COMMENT ON FUNCTION public.update_updated_at_column IS 'Updates the updated_at timestamp (search_path secured)';