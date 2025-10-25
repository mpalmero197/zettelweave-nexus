-- Create table for saved Catalyst documents
CREATE TABLE public.catalyst_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  selected_source TEXT NOT NULL,
  selected_items JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalyst_documents ENABLE ROW LEVEL SECURITY;

-- Policies for catalyst_documents
CREATE POLICY "Users can view their own catalyst documents"
ON public.catalyst_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own catalyst documents"
ON public.catalyst_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own catalyst documents"
ON public.catalyst_documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own catalyst documents"
ON public.catalyst_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_catalyst_documents_updated_at
BEFORE UPDATE ON public.catalyst_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();