
-- ============ Scholar curriculum tables ============
CREATE TABLE public.scholar_modules (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholar_modules TO authenticated;
GRANT ALL ON public.scholar_modules TO service_role;
ALTER TABLE public.scholar_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read modules" ON public.scholar_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage modules" ON public.scholar_modules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.scholar_lessons (
  slug TEXT PRIMARY KEY,
  module_slug TEXT NOT NULL REFERENCES public.scholar_modules(slug) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  written_md TEXT,
  walkthrough_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  alice_system_prompt TEXT,
  video_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ,
  source_commit TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholar_lessons TO authenticated;
GRANT ALL ON public.scholar_lessons TO service_role;
ALTER TABLE public.scholar_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read lessons" ON public.scholar_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lessons" ON public.scholar_lessons FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.scholar_progress (
  user_id UUID NOT NULL,
  lesson_slug TEXT NOT NULL REFERENCES public.scholar_lessons(slug) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  formats_completed TEXT[] NOT NULL DEFAULT '{}',
  score INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholar_progress TO authenticated;
GRANT ALL ON public.scholar_progress TO service_role;
ALTER TABLE public.scholar_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress" ON public.scholar_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.scholar_badges (
  user_id UUID NOT NULL,
  badge_slug TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholar_badges TO authenticated;
GRANT ALL ON public.scholar_badges TO service_role;
ALTER TABLE public.scholar_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own badges" ON public.scholar_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.scholar_points (
  user_id UUID PRIMARY KEY,
  total INT NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholar_points TO authenticated;
GRANT ALL ON public.scholar_points TO service_role;
ALTER TABLE public.scholar_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own points" ON public.scholar_points FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Sandbox tables (owner-only, isolated) ============
CREATE TABLE public.sandbox_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sandbox_notebooks TO authenticated;
GRANT ALL ON public.sandbox_notebooks TO service_role;
ALTER TABLE public.sandbox_notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sandbox notebooks" ON public.sandbox_notebooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sandbox_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notebook_id UUID REFERENCES public.sandbox_notebooks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sandbox_notes TO authenticated;
GRANT ALL ON public.sandbox_notes TO service_role;
ALTER TABLE public.sandbox_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sandbox notes" ON public.sandbox_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sandbox_zettel_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  linked_cards UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sandbox_zettel_cards TO authenticated;
GRANT ALL ON public.sandbox_zettel_cards TO service_role;
ALTER TABLE public.sandbox_zettel_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sandbox cards" ON public.sandbox_zettel_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Seed function ============
CREATE OR REPLACE FUNCTION public.seed_sandbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_nb1 UUID;
  v_nb2 UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Wipe existing sandbox content for this user
  DELETE FROM public.sandbox_zettel_cards WHERE user_id = v_user;
  DELETE FROM public.sandbox_notes WHERE user_id = v_user;
  DELETE FROM public.sandbox_notebooks WHERE user_id = v_user;

  INSERT INTO public.sandbox_notebooks (user_id, name, color) VALUES
    (v_user, 'Worldbuilding: Aethelgard', '#7c5cff') RETURNING id INTO v_nb1;
  INSERT INTO public.sandbox_notebooks (user_id, name, color) VALUES
    (v_user, 'Chapter Drafts', '#4f8bff') RETURNING id INTO v_nb2;

  INSERT INTO public.sandbox_notes (user_id, notebook_id, title, content) VALUES
    (v_user, v_nb1, 'The Sundered Throne', 'A fractured kingdom seeking unity after the fall of King Elden...'),
    (v_user, v_nb1, 'Magic System: Echoglass', 'Magic is channeled through fragments of obsidian that store echoes of the past.'),
    (v_user, v_nb2, 'Chapter 1: The Messenger', 'The rider arrived at dawn, breathless and bleeding...');

  INSERT INTO public.sandbox_zettel_cards (user_id, title, content, category) VALUES
    (v_user, 'Character: Maerwen', 'A scholar-knight bound to the broken throne by ancient oath.', 'character'),
    (v_user, 'Location: Hollow Spire', 'Tower of the Echoglass keepers; rises above the mistlands.', 'location'),
    (v_user, 'Theme: Memory as Weapon', 'Those who remember the truth wield power over those who forget.', 'theme');
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_sandbox() TO authenticated;

CREATE TRIGGER scholar_lessons_updated_at BEFORE UPDATE ON public.scholar_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER scholar_modules_updated_at BEFORE UPDATE ON public.scholar_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER scholar_progress_updated_at BEFORE UPDATE ON public.scholar_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sandbox_notes_updated_at BEFORE UPDATE ON public.sandbox_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sandbox_cards_updated_at BEFORE UPDATE ON public.sandbox_zettel_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
