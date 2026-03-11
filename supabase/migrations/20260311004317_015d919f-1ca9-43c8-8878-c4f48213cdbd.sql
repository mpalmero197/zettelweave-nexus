
-- Saved courses table
CREATE TABLE public.saved_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  provider text,
  url text NOT NULL,
  description text,
  difficulty text,
  duration text,
  is_free boolean DEFAULT false,
  syllabus jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'want_to_take',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own courses" ON public.saved_courses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reading list table
CREATE TABLE public.reading_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_key text NOT NULL,
  title text NOT NULL,
  author text,
  cover_id integer,
  year integer,
  subjects jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'want_to_read',
  notes text,
  rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reading_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reading list" ON public.reading_list
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
