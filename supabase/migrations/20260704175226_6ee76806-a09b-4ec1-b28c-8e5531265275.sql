
DROP POLICY IF EXISTS "Authenticated users can report errors" ON public.error_reports;
CREATE POLICY "Authenticated users can report errors"
ON public.error_reports
FOR INSERT
TO authenticated
WITH CHECK (
  error_signature IS NOT NULL
  AND char_length(error_signature) BETWEEN 1 AND 512
  AND char_length(coalesce(error_message,'')) <= 8000
  AND char_length(coalesce(stack_trace,'')) <= 20000
);

DROP POLICY IF EXISTS "Anyone can insert quiz leads" ON public.quiz_funnel_leads;
CREATE POLICY "Anyone can insert quiz leads"
ON public.quiz_funnel_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND char_length(email) BETWEEN 3 AND 254
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
