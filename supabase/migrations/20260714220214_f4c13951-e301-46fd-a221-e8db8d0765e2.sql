
-- alice_decks
CREATE TABLE public.alice_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Deck',
  description TEXT,
  cols INTEGER NOT NULL DEFAULT 5 CHECK (cols BETWEEN 1 AND 12),
  rows INTEGER NOT NULL DEFAULT 3 CHECK (rows BETWEEN 1 AND 12),
  background TEXT,
  theme TEXT NOT NULL DEFAULT 'default',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_decks TO authenticated;
GRANT ALL ON public.alice_decks TO service_role;
ALTER TABLE public.alice_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own decks" ON public.alice_decks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_alice_decks_updated BEFORE UPDATE ON public.alice_decks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- alice_deck_folders
CREATE TABLE public.alice_deck_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.alice_decks(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.alice_deck_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Folder',
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_deck_folders TO authenticated;
GRANT ALL ON public.alice_deck_folders TO service_role;
ALTER TABLE public.alice_deck_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deck folders" ON public.alice_deck_folders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.alice_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alice_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));

-- alice_deck_tiles
CREATE TABLE public.alice_deck_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.alice_decks(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.alice_deck_folders(id) ON DELETE CASCADE,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  w INTEGER NOT NULL DEFAULT 1 CHECK (w BETWEEN 1 AND 12),
  h INTEGER NOT NULL DEFAULT 1 CHECK (h BETWEEN 1 AND 12),
  kind TEXT NOT NULL DEFAULT 'noop' CHECK (kind IN ('macro','folder','widget','multi','noop','alice_chat','hotkey','url')),
  label TEXT,
  icon TEXT,
  bg_color TEXT,
  fg_color TEXT,
  macro_id UUID REFERENCES public.alice_macros(id) ON DELETE SET NULL,
  target_folder_id UUID REFERENCES public.alice_deck_folders(id) ON DELETE SET NULL,
  widget_type TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  hotkey TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alice_deck_tiles_deck ON public.alice_deck_tiles(deck_id);
CREATE INDEX idx_alice_deck_tiles_folder ON public.alice_deck_tiles(folder_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_deck_tiles TO authenticated;
GRANT ALL ON public.alice_deck_tiles TO service_role;
ALTER TABLE public.alice_deck_tiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deck tiles" ON public.alice_deck_tiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.alice_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.alice_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));
CREATE TRIGGER trg_alice_deck_tiles_updated BEFORE UPDATE ON public.alice_deck_tiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- alice_deck_shares (phone pairing codes)
CREATE TABLE public.alice_deck_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.alice_decks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  scopes TEXT[] NOT NULL DEFAULT ARRAY['view','press'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_deck_shares TO authenticated;
GRANT ALL ON public.alice_deck_shares TO service_role;
ALTER TABLE public.alice_deck_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage shares" ON public.alice_deck_shares FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "signed-in can read live share by code" ON public.alice_deck_shares FOR SELECT
  TO authenticated USING (expires_at > now());
