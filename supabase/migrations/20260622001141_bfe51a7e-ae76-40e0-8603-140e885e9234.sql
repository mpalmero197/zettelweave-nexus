
-- Add profile preference for Alice auto-reminders (default ON)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alice_auto_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alice_reminder_offsets integer[] NOT NULL DEFAULT ARRAY[1440, 60, 15];

-- Make reminders idempotent per (user, item, offset)
CREATE UNIQUE INDEX IF NOT EXISTS reminders_user_item_offset_uidx
  ON public.reminders (user_id, item_type, item_id, offset_minutes);

-- Schedule alice-calendar-watch every 5 minutes
SELECT cron.unschedule('alice-calendar-watch-5min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'alice-calendar-watch-5min'
);

SELECT cron.schedule(
  'alice-calendar-watch-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/alice-calendar-watch',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
