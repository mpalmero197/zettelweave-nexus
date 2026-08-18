CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_event_details jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Callers may only log events for themselves; admins/service role may log for anyone.
  IF _uid IS NOT NULL AND p_user_id IS DISTINCT FROM _uid AND NOT public.is_admin(_uid) THEN
    p_user_id := _uid;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id, event_type, event_details, ip_address, user_agent
  ) VALUES (
    p_user_id, p_event_type, p_event_details, p_ip_address, p_user_agent
  );
END;
$function$;