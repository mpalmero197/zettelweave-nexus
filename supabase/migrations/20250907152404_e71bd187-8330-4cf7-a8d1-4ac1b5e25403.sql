-- Enable password strength and leaked password protection in Supabase Auth
-- Note: These settings need to be configured in the Supabase dashboard as well

-- Create a function to validate password strength on the database level
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for security audit log (only admins can view)
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users cannot read audit logs" ON public.security_audit_log
    FOR SELECT USING (false);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean old audit logs (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.security_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add security constraints to existing tables
-- Ensure zettel_cards content has reasonable limits
ALTER TABLE public.zettel_cards 
ADD CONSTRAINT check_title_length CHECK (LENGTH(title) <= 200);

ALTER TABLE public.zettel_cards 
ADD CONSTRAINT check_content_length CHECK (LENGTH(content) <= 10000);

ALTER TABLE public.zettel_cards 
ADD CONSTRAINT check_description_length CHECK (LENGTH(description) <= 500);

-- Add constraint to limit number of tags
ALTER TABLE public.zettel_cards 
ADD CONSTRAINT check_tags_count CHECK (array_length(tags, 1) <= 20 OR tags IS NULL);

-- Add constraint to limit number of linked cards
ALTER TABLE public.zettel_cards 
ADD CONSTRAINT check_linked_cards_count CHECK (array_length(linked_cards, 1) <= 50 OR linked_cards IS NULL);

-- Create index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_zettel_cards_user_id_created 
ON public.zettel_cards (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zettel_cards_category 
ON public.zettel_cards (category);

CREATE INDEX IF NOT EXISTS idx_zettel_cards_tags 
ON public.zettel_cards USING GIN (tags);

-- Comment on security measures
COMMENT ON FUNCTION public.validate_password_strength IS 'Validates password meets security requirements';
COMMENT ON TABLE public.security_audit_log IS 'Logs security-related events for monitoring';
COMMENT ON FUNCTION public.log_security_event IS 'Logs security events with user context';
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Removes audit logs older than 90 days';