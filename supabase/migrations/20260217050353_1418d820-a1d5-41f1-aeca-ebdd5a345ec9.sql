
-- Create mind_maps table
CREATE TABLE public.mind_maps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  map_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_mode text DEFAULT 'radial',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mind maps" ON public.mind_maps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own mind maps" ON public.mind_maps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mind maps" ON public.mind_maps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mind maps" ON public.mind_maps FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON public.mind_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
