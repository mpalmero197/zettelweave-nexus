
-- Create master_document_subjects table
CREATE TABLE public.master_document_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  catalyst_document_id UUID REFERENCES public.catalyst_documents(id) ON DELETE SET NULL,
  last_synthesized_at TIMESTAMPTZ,
  source_count INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.master_document_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subjects"
  ON public.master_document_subjects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add auto_master_docs preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_master_docs BOOLEAN DEFAULT FALSE;

-- Add is_master_document flag to catalyst_documents
ALTER TABLE public.catalyst_documents ADD COLUMN IF NOT EXISTS is_master_document BOOLEAN DEFAULT FALSE;

-- Create trigger for updated_at on master_document_subjects
CREATE TRIGGER update_master_document_subjects_updated_at
  BEFORE UPDATE ON public.master_document_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for master_document_subjects
ALTER PUBLICATION supabase_realtime ADD TABLE master_document_subjects;

-- Create synthesis queue table for trigger-based processing
CREATE TABLE public.synthesis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL, -- 'card_created', 'note_created', etc.
  trigger_item_id UUID,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.synthesis_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own queue"
  ON public.synthesis_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to queue synthesis when content changes
CREATE OR REPLACE FUNCTION public.queue_synthesis_on_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auto_enabled BOOLEAN;
BEGIN
  -- Check if user has auto master docs enabled
  SELECT auto_master_docs INTO _auto_enabled
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF _auto_enabled = TRUE THEN
    INSERT INTO public.synthesis_queue (user_id, trigger_type, trigger_item_id)
    VALUES (NEW.user_id, TG_ARGV[0], NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers on content tables
CREATE TRIGGER queue_synthesis_on_card_change
  AFTER INSERT OR UPDATE ON public.zettel_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_synthesis_on_content_change('card');

CREATE TRIGGER queue_synthesis_on_note_change
  AFTER INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_synthesis_on_content_change('note');
