
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the send-reminders function to run every minute
SELECT cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/send-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
