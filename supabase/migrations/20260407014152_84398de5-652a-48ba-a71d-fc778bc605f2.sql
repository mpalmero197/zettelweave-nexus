SELECT cron.schedule(
  'daily-report-6pm-ct',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/daily-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);