-- Create recordings table to store all types of recordings
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  recording_type TEXT NOT NULL CHECK (recording_type IN ('audio', 'video', 'screen', 'screen_with_audio')),
  storage_path TEXT NOT NULL,
  duration INTEGER, -- in seconds
  file_size BIGINT,
  thumbnail_url TEXT,
  transcription TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON public.recordings FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('video-recordings', 'video-recordings', false),
  ('screen-recordings', 'screen-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for video-recordings bucket
CREATE POLICY "Users can view their own video recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own video recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own video recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'video-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for screen-recordings bucket
CREATE POLICY "Users can view their own screen recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'screen-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own screen recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'screen-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own screen recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'screen-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add updated_at trigger
CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON public.recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_recordings_user_type ON public.recordings(user_id, recording_type) WHERE deleted_at IS NULL;