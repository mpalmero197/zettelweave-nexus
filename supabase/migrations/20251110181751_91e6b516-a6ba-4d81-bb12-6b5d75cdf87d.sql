-- Fix security warning for calculate_next_execution function
DROP FUNCTION IF EXISTS calculate_next_execution(JSONB, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION calculate_next_execution(workflow_config JSONB, base_time TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  frequency TEXT;
  next_time TIMESTAMP WITH TIME ZONE;
BEGIN
  frequency := workflow_config->>'frequency';
  
  CASE frequency
    WHEN 'hourly' THEN
      next_time := base_time + INTERVAL '1 hour';
    WHEN 'daily' THEN
      next_time := base_time + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_time := base_time + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_time := base_time + INTERVAL '30 days';
    ELSE
      next_time := base_time + INTERVAL '1 day';
  END CASE;
  
  RETURN next_time;
END;
$$;