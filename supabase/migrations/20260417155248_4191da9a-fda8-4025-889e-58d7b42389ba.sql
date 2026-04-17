-- Enums
DO $$ BEGIN
  CREATE TYPE public.shared_item_type AS ENUM ('zettel_card','note','file','mind_map','catalyst_document','sticky_note','scratchpad');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.share_permission AS ENUM ('view','edit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.share_mode AS ENUM ('copy','collaborate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.share_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- shared_items table
CREATE TABLE IF NOT EXISTS public.shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  item_type public.shared_item_type NOT NULL,
  item_id UUID NOT NULL,
  permission public.share_permission NOT NULL DEFAULT 'view',
  share_mode public.share_mode NOT NULL DEFAULT 'collaborate',
  status public.share_status NOT NULL DEFAULT 'accepted',
  message TEXT,
  cloned_item_id UUID,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, recipient_id, item_type, item_id, share_mode)
);

CREATE INDEX IF NOT EXISTS idx_shared_items_recipient ON public.shared_items(recipient_id, item_type);
CREATE INDEX IF NOT EXISTS idx_shared_items_owner ON public.shared_items(owner_id, item_type);
CREATE INDEX IF NOT EXISTS idx_shared_items_lookup ON public.shared_items(item_type, item_id);

ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and recipient can view shares"
  ON public.shared_items FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = recipient_id);

CREATE POLICY "Owner can create shares"
  ON public.shared_items FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update shares"
  ON public.shared_items FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Recipient can update viewed/status"
  ON public.shared_items FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Owner or recipient can delete"
  ON public.shared_items FOR DELETE
  USING (auth.uid() = owner_id OR auth.uid() = recipient_id);

CREATE TRIGGER trg_shared_items_updated
  BEFORE UPDATE ON public.shared_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- item_presence table
CREATE TABLE IF NOT EXISTS public.item_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type public.shared_item_type NOT NULL,
  item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_editing BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (item_type, item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_item_presence_lookup ON public.item_presence(item_type, item_id, last_seen_at DESC);

ALTER TABLE public.item_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone with share access can read presence"
  ON public.item_presence FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users manage own presence"
  ON public.item_presence FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Security definer access helper
CREATE OR REPLACE FUNCTION public.has_share_access(
  _item_type public.shared_item_type,
  _item_id UUID,
  _required public.share_permission DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_items
    WHERE recipient_id = auth.uid()
      AND item_type = _item_type
      AND item_id = _item_id
      AND share_mode = 'collaborate'
      AND status = 'accepted'
      AND (_required = 'view' OR permission = 'edit')
  );
$$;

-- Extend RLS on shareable tables
-- zettel_cards
DROP POLICY IF EXISTS "Shared collaborators can view zettel cards" ON public.zettel_cards;
CREATE POLICY "Shared collaborators can view zettel cards"
  ON public.zettel_cards FOR SELECT
  USING (public.has_share_access('zettel_card', id, 'view'));

DROP POLICY IF EXISTS "Shared collaborators can edit zettel cards" ON public.zettel_cards;
CREATE POLICY "Shared collaborators can edit zettel cards"
  ON public.zettel_cards FOR UPDATE
  USING (public.has_share_access('zettel_card', id, 'edit'));

-- notes
DROP POLICY IF EXISTS "Shared collaborators can view notes" ON public.notes;
CREATE POLICY "Shared collaborators can view notes"
  ON public.notes FOR SELECT
  USING (public.has_share_access('note', id, 'view'));

DROP POLICY IF EXISTS "Shared collaborators can edit notes" ON public.notes;
CREATE POLICY "Shared collaborators can edit notes"
  ON public.notes FOR UPDATE
  USING (public.has_share_access('note', id, 'edit'));

-- files
DROP POLICY IF EXISTS "Shared collaborators can view files" ON public.files;
CREATE POLICY "Shared collaborators can view files"
  ON public.files FOR SELECT
  USING (public.has_share_access('file', id, 'view'));

DROP POLICY IF EXISTS "Shared collaborators can edit files" ON public.files;
CREATE POLICY "Shared collaborators can edit files"
  ON public.files FOR UPDATE
  USING (public.has_share_access('file', id, 'edit'));

-- mind_maps
DROP POLICY IF EXISTS "Shared collaborators can view mind maps" ON public.mind_maps;
CREATE POLICY "Shared collaborators can view mind maps"
  ON public.mind_maps FOR SELECT
  USING (public.has_share_access('mind_map', id, 'view'));

DROP POLICY IF EXISTS "Shared collaborators can edit mind maps" ON public.mind_maps;
CREATE POLICY "Shared collaborators can edit mind maps"
  ON public.mind_maps FOR UPDATE
  USING (public.has_share_access('mind_map', id, 'edit'));

-- catalyst_documents
DROP POLICY IF EXISTS "Shared collaborators can view catalyst docs" ON public.catalyst_documents;
CREATE POLICY "Shared collaborators can view catalyst docs"
  ON public.catalyst_documents FOR SELECT
  USING (public.has_share_access('catalyst_document', id, 'view'));

DROP POLICY IF EXISTS "Shared collaborators can edit catalyst docs" ON public.catalyst_documents;
CREATE POLICY "Shared collaborators can edit catalyst docs"
  ON public.catalyst_documents FOR UPDATE
  USING (public.has_share_access('catalyst_document', id, 'edit'));