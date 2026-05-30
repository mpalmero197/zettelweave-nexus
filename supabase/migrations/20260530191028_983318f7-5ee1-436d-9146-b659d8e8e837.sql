CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('alice-run-step-every-minute')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alice-run-step-every-minute');

SELECT cron.schedule(
  'alice-run-step-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/alice-run-step',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);