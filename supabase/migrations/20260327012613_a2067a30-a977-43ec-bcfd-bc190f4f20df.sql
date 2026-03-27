CREATE TABLE public.knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  description text NOT NULL,
  detailed_explanation text,
  what_you_know text,
  what_you_need_to_learn text,
  severity text NOT NULL DEFAULT 'medium',
  interest text NOT NULL DEFAULT 'unsure',
  status text NOT NULL DEFAULT 'new',
  source_materials jsonb DEFAULT '[]'::jsonb,
  resources jsonb DEFAULT '{}'::jsonb,
  scan_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own knowledge gaps"
  ON public.knowledge_gaps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge gaps"
  ON public.knowledge_gaps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge gaps"
  ON public.knowledge_gaps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge gaps"
  ON public.knowledge_gaps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);