-- Ensure pg_cron + pg_net are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with same name
SELECT cron.unschedule('seo-aeo-self-improve-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'seo-aeo-self-improve-daily'
);

SELECT cron.schedule(
  'seo-aeo-self-improve-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/seo-aeo-self-improve',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);