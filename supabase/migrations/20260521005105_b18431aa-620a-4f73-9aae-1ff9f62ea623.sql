ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notebooks_parent ON public.notebooks(parent_id);