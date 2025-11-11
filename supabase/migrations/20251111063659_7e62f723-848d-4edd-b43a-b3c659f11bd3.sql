-- Create feature requests table
CREATE TABLE public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  votes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create error reports table with deduplication
CREATE TABLE public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_signature TEXT NOT NULL UNIQUE, -- Hash of error for deduplication
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  filename TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_agent TEXT,
  url TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new',
  severity TEXT NOT NULL DEFAULT 'error'
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Feature requests policies
CREATE POLICY "Users can create feature requests"
  ON public.feature_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all feature requests"
  ON public.feature_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own feature requests"
  ON public.feature_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feature requests"
  ON public.feature_requests
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Error reports policies (only system and admins)
CREATE POLICY "System can insert error reports"
  ON public.error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update error reports"
  ON public.error_reports
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can view all error reports"
  ON public.error_reports
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create function to upsert error reports with deduplication
CREATE OR REPLACE FUNCTION public.report_error(
  p_error_signature TEXT,
  p_error_type TEXT,
  p_error_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_filename TEXT DEFAULT NULL,
  p_line_number INTEGER DEFAULT NULL,
  p_column_number INTEGER DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_error_id UUID;
BEGIN
  -- Try to find existing error with same signature
  SELECT id INTO v_error_id
  FROM public.error_reports
  WHERE error_signature = p_error_signature;

  IF v_error_id IS NOT NULL THEN
    -- Update existing error
    UPDATE public.error_reports
    SET 
      occurrence_count = occurrence_count + 1,
      last_seen_at = now()
    WHERE id = v_error_id;
  ELSE
    -- Insert new error
    INSERT INTO public.error_reports (
      error_signature,
      error_type,
      error_message,
      stack_trace,
      filename,
      line_number,
      column_number,
      user_agent,
      url,
      severity
    ) VALUES (
      p_error_signature,
      p_error_type,
      p_error_message,
      p_stack_trace,
      p_filename,
      p_line_number,
      p_column_number,
      p_user_agent,
      p_url,
      p_severity
    )
    RETURNING id INTO v_error_id;
  END IF;

  RETURN v_error_id;
END;
$$;