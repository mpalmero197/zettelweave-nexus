
-- Add appointment and scheduling fields to calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS end_time time without time zone,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS event_category text DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS reminder_minutes integer,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS is_all_day boolean DEFAULT false;
