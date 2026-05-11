-- Daily briefings table
CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  briefing_date date NOT NULL,
  headline text NOT NULL DEFAULT 'Your daily briefing',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_push boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_user_date
  ON public.daily_briefings (user_id, briefing_date DESC);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON public.daily_briefings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefings"
  ON public.daily_briefings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own briefings"
  ON public.daily_briefings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own briefings"
  ON public.daily_briefings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_briefings_updated_at
  BEFORE UPDATE ON public.daily_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_briefing_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_briefing_hour smallint NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS daily_briefing_timezone text NOT NULL DEFAULT 'UTC';