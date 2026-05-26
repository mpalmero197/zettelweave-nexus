select cron.schedule(
  'alice-proactive-notifier-2m',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/alice-proactive-notifier',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);