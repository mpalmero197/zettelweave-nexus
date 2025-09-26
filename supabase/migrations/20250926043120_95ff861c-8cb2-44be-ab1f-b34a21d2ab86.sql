-- Create attachments table for storing file references
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  duration REAL NULL, -- For audio/video files
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for attachments
CREATE POLICY "Users can view their own attachments" 
ON public.attachments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attachments" 
ON public.attachments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attachments" 
ON public.attachments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" 
ON public.attachments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add attachments columns to existing tables
ALTER TABLE public.zettel_cards 
ADD COLUMN attachments UUID[] DEFAULT '{}';

ALTER TABLE public.notes 
ADD COLUMN attachments UUID[] DEFAULT '{}';

-- Create storage buckets for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-snippets', 'audio-snippets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-recordings', 'meeting-recordings', false);

-- Create storage policies for audio snippets
CREATE POLICY "Users can view their own audio snippets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio snippets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio snippets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio snippets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-snippets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for meeting recordings
CREATE POLICY "Users can view their own meeting recordings" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own meeting recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own meeting recordings" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own meeting recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for updated_at
CREATE TRIGGER update_attachments_updated_at
BEFORE UPDATE ON public.attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();