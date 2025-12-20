-- Create table to store tool test history
CREATE TABLE public.tool_test_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_tests INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  results JSONB NOT NULL,
  triggered_by TEXT DEFAULT 'scheduled'
);

-- Enable RLS
ALTER TABLE public.tool_test_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view test history
CREATE POLICY "Admins can view tool test history"
ON public.tool_test_history
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only service role (edge functions) can insert
CREATE POLICY "Service role can insert test history"
ON public.tool_test_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Create index for efficient querying by date
CREATE INDEX idx_tool_test_history_created_at ON public.tool_test_history(created_at DESC);

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;