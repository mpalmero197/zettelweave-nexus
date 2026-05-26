
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS progress NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_stage TEXT,
  ADD COLUMN IF NOT EXISTS progress_detail TEXT,
  ADD COLUMN IF NOT EXISTS progress_sections_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_sections_done INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_words_target INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_words_done INTEGER DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS author_style_mimicry_enabled BOOLEAN DEFAULT true;

-- Enable realtime so the wizard can subscribe to progress updates
ALTER TABLE public.agent_runs REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_runs';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
