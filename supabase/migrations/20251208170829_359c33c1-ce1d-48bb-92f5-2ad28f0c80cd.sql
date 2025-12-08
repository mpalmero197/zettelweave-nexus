-- Create scratchpad_notes table for syncing between app and extension
CREATE TABLE public.scratchpad_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scratchpad_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own scratchpad notes"
ON public.scratchpad_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scratchpad notes"
ON public.scratchpad_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scratchpad notes"
ON public.scratchpad_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scratchpad notes"
ON public.scratchpad_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scratchpad_notes_updated_at
BEFORE UPDATE ON public.scratchpad_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();