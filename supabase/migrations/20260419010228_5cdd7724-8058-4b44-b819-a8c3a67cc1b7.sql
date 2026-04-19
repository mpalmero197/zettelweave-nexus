-- ============================================================
-- SPACES — Robust upgrade: sharing, linked items, comments,
-- activity, formulas
-- ============================================================

-- 1) Extend enum types ---------------------------------------
ALTER TYPE shared_item_type ADD VALUE IF NOT EXISTS 'space';
ALTER TYPE shared_item_type ADD VALUE IF NOT EXISTS 'space_object';

-- 2) Add formula support to relation_definitions ------------
ALTER TABLE public.relation_definitions
  ADD COLUMN IF NOT EXISTS formula_expression text;

-- 3) Space collaborators ------------------------------------
CREATE TABLE IF NOT EXISTS public.space_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  collaborator_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view','comment','edit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, collaborator_id)
);
CREATE INDEX IF NOT EXISTS idx_space_collab_space ON public.space_collaborators(space_id);
CREATE INDEX IF NOT EXISTS idx_space_collab_user  ON public.space_collaborators(collaborator_id);

ALTER TABLE public.space_collaborators ENABLE ROW LEVEL SECURITY;

-- 4) Helper: has_space_access (security definer, avoids recursion)
CREATE OR REPLACE FUNCTION public.has_space_access(_space_id uuid, _required text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces s WHERE s.id = _space_id AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.space_collaborators sc
    WHERE sc.space_id = _space_id
      AND sc.collaborator_id = auth.uid()
      AND sc.status = 'accepted'
      AND (
        _required = 'view'
        OR (_required = 'comment' AND sc.permission IN ('comment','edit'))
        OR (_required = 'edit'    AND sc.permission = 'edit')
      )
  );
$$;

-- Collaborator RLS
CREATE POLICY "Owners manage space collaborators"
  ON public.space_collaborators FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Collaborators view their invites"
  ON public.space_collaborators FOR SELECT
  USING (auth.uid() = collaborator_id);

CREATE POLICY "Collaborators update their invite status"
  ON public.space_collaborators FOR UPDATE
  USING (auth.uid() = collaborator_id);

-- 5) Space linked items (live mirrors of other PendragonX content)
CREATE TABLE IF NOT EXISTS public.space_linked_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  user_id uuid NOT NULL,
  item_type shared_item_type NOT NULL,
  item_id uuid NOT NULL,
  added_by uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_space_linked_space ON public.space_linked_items(space_id);
CREATE INDEX IF NOT EXISTS idx_space_linked_item  ON public.space_linked_items(item_type, item_id);

ALTER TABLE public.space_linked_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View linked items via space access"
  ON public.space_linked_items FOR SELECT
  USING (public.has_space_access(space_id, 'view'));

CREATE POLICY "Edit linked items requires edit access"
  ON public.space_linked_items FOR INSERT
  WITH CHECK (public.has_space_access(space_id, 'edit') AND auth.uid() = added_by);

CREATE POLICY "Update linked items requires edit access"
  ON public.space_linked_items FOR UPDATE
  USING (public.has_space_access(space_id, 'edit'));

CREATE POLICY "Delete linked items requires edit access"
  ON public.space_linked_items FOR DELETE
  USING (public.has_space_access(space_id, 'edit'));

-- 6) Object comments ----------------------------------------
CREATE TABLE IF NOT EXISTS public.space_object_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  object_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.space_object_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_space_obj_comments_object ON public.space_object_comments(object_id);

ALTER TABLE public.space_object_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comments via space access"
  ON public.space_object_comments FOR SELECT
  USING (public.has_space_access(space_id, 'view'));

CREATE POLICY "Add comments via comment access"
  ON public.space_object_comments FOR INSERT
  WITH CHECK (public.has_space_access(space_id, 'comment') AND auth.uid() = user_id);

CREATE POLICY "Update own comments"
  ON public.space_object_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own comments"
  ON public.space_object_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 7) Object activity log ------------------------------------
CREATE TABLE IF NOT EXISTS public.space_object_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL,
  object_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,            -- e.g. 'created','updated','linked','commented','archived'
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_space_obj_activity_object ON public.space_object_activity(object_id, created_at DESC);

ALTER TABLE public.space_object_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View activity via space access"
  ON public.space_object_activity FOR SELECT
  USING (public.has_space_access(space_id, 'view'));

CREATE POLICY "Insert activity for own actions in accessible space"
  ON public.space_object_activity FOR INSERT
  WITH CHECK (public.has_space_access(space_id, 'view') AND auth.uid() = actor_id);

-- 8) Extend RLS on existing space tables to honor collaborators
-- (Only ADD policies; do not drop existing owner policies.)

-- spaces
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spaces' AND policyname='Collaborators can view shared spaces') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared spaces" ON public.spaces
      FOR SELECT USING (public.has_space_access(id, 'view'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spaces' AND policyname='Collaborators with edit can update spaces') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can update spaces" ON public.spaces
      FOR UPDATE USING (public.has_space_access(id, 'edit'))$p$;
  END IF;
END $$;

-- object_types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_types' AND policyname='Collaborators can view shared object_types') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared object_types" ON public.object_types
      FOR SELECT USING (public.has_space_access(space_id, 'view'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_types' AND policyname='Collaborators with edit can modify object_types') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify object_types" ON public.object_types
      FOR ALL USING (public.has_space_access(space_id, 'edit')) WITH CHECK (public.has_space_access(space_id, 'edit'))$p$;
  END IF;
END $$;

-- relation_definitions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='relation_definitions' AND policyname='Collaborators can view shared relation_definitions') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared relation_definitions" ON public.relation_definitions
      FOR SELECT USING (public.has_space_access(space_id, 'view'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='relation_definitions' AND policyname='Collaborators with edit can modify relation_definitions') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify relation_definitions" ON public.relation_definitions
      FOR ALL USING (public.has_space_access(space_id, 'edit')) WITH CHECK (public.has_space_access(space_id, 'edit'))$p$;
  END IF;
END $$;

-- type_relations (joined via object_type → space)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='type_relations' AND policyname='Collaborators can view shared type_relations') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared type_relations" ON public.type_relations
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.object_types ot
        WHERE ot.id = type_relations.object_type_id
          AND public.has_space_access(ot.space_id, 'view')
      ))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='type_relations' AND policyname='Collaborators with edit can modify type_relations') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify type_relations" ON public.type_relations
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.object_types ot
        WHERE ot.id = type_relations.object_type_id
          AND public.has_space_access(ot.space_id, 'edit')
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM public.object_types ot
        WHERE ot.id = type_relations.object_type_id
          AND public.has_space_access(ot.space_id, 'edit')
      ))$p$;
  END IF;
END $$;

-- space_objects
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='space_objects' AND policyname='Collaborators can view shared space_objects') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared space_objects" ON public.space_objects
      FOR SELECT USING (public.has_space_access(space_id, 'view'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='space_objects' AND policyname='Collaborators with edit can modify space_objects') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify space_objects" ON public.space_objects
      FOR ALL USING (public.has_space_access(space_id, 'edit')) WITH CHECK (public.has_space_access(space_id, 'edit'))$p$;
  END IF;
END $$;

-- object_relation_values (joined via space_object → space)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_relation_values' AND policyname='Collaborators can view shared relation_values') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared relation_values" ON public.object_relation_values
      FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.space_objects so
        WHERE so.id = object_relation_values.object_id
          AND public.has_space_access(so.space_id, 'view')
      ))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_relation_values' AND policyname='Collaborators with edit can modify relation_values') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify relation_values" ON public.object_relation_values
      FOR ALL USING (EXISTS (
        SELECT 1 FROM public.space_objects so
        WHERE so.id = object_relation_values.object_id
          AND public.has_space_access(so.space_id, 'edit')
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM public.space_objects so
        WHERE so.id = object_relation_values.object_id
          AND public.has_space_access(so.space_id, 'edit')
      ))$p$;
  END IF;
END $$;

-- object_sets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_sets' AND policyname='Collaborators can view shared object_sets') THEN
    EXECUTE $p$CREATE POLICY "Collaborators can view shared object_sets" ON public.object_sets
      FOR SELECT USING (public.has_space_access(space_id, 'view'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='object_sets' AND policyname='Collaborators with edit can modify object_sets') THEN
    EXECUTE $p$CREATE POLICY "Collaborators with edit can modify object_sets" ON public.object_sets
      FOR ALL USING (public.has_space_access(space_id, 'edit')) WITH CHECK (public.has_space_access(space_id, 'edit'))$p$;
  END IF;
END $$;

-- 9) updated_at triggers ------------------------------------
CREATE TRIGGER trg_space_collab_updated
  BEFORE UPDATE ON public.space_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_space_obj_comments_updated
  BEFORE UPDATE ON public.space_object_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();