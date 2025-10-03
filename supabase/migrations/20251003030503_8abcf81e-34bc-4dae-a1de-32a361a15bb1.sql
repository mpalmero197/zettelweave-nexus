-- Add soft-delete columns to zettel_cards
ALTER TABLE public.zettel_cards
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMP WITH TIME ZONE;

-- Add soft-delete columns to notes
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMP WITH TIME ZONE;

-- Add soft-delete columns to files
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMP WITH TIME ZONE;

-- Create user_preferences table for delete settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_delete_days INTEGER NOT NULL DEFAULT 30 CHECK (auto_delete_days IN (7, 15, 30, 60)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to auto-delete old items
CREATE OR REPLACE FUNCTION public.auto_delete_expired_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permanently delete expired zettel cards
  DELETE FROM public.zettel_cards
  WHERE deleted_at IS NOT NULL 
    AND permanent_delete_at IS NOT NULL 
    AND permanent_delete_at < NOW();

  -- Permanently delete expired notes
  DELETE FROM public.notes
  WHERE deleted_at IS NOT NULL 
    AND permanent_delete_at IS NOT NULL 
    AND permanent_delete_at < NOW();

  -- Permanently delete expired files and their storage
  DELETE FROM public.files
  WHERE deleted_at IS NOT NULL 
    AND permanent_delete_at IS NOT NULL 
    AND permanent_delete_at < NOW();
END;
$$;

-- Add trigger for user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster soft-delete queries
CREATE INDEX IF NOT EXISTS idx_zettel_cards_deleted_at ON public.zettel_cards(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON public.notes(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON public.files(deleted_at) WHERE deleted_at IS NOT NULL;