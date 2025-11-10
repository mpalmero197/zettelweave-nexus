-- Create import_history table to track imported files from Obsidian/Notion
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL, -- 'obsidian' or 'notion'
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL, -- hash of content to detect changes
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  card_id UUID, -- reference to created card (optional)
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, source_type, file_path)
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own import history"
  ON public.import_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import history"
  ON public.import_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import history"
  ON public.import_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import history"
  ON public.import_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_import_history_user_source ON public.import_history(user_id, source_type);
CREATE INDEX idx_import_history_file_hash ON public.import_history(file_hash);