
-- Spaces (workspaces)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏠',
  color TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own spaces" ON public.spaces FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Object Types (Page, Task, Bookmark, etc.)
CREATE TABLE public.object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📄',
  color TEXT,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own object types" ON public.object_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Relation definitions (properties)
CREATE TABLE public.relation_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'text',
  options JSONB DEFAULT '[]'::jsonb,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relation_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own relations" ON public.relation_definitions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Type-Relation mapping
CREATE TABLE public.type_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  relation_id UUID NOT NULL REFERENCES public.relation_definitions(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  UNIQUE(object_type_id, relation_id)
);
ALTER TABLE public.type_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage type relations via object types" ON public.type_relations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.object_types ot WHERE ot.id = object_type_id AND ot.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.object_types ot WHERE ot.id = object_type_id AND ot.user_id = auth.uid()));

-- Space Objects
CREATE TABLE public.space_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES public.object_types(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  icon TEXT,
  content TEXT DEFAULT '',
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.space_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own objects" ON public.space_objects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Object Relation Values
CREATE TABLE public.object_relation_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES public.space_objects(id) ON DELETE CASCADE,
  relation_id UUID NOT NULL REFERENCES public.relation_definitions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date TIMESTAMPTZ,
  value_boolean BOOLEAN,
  value_json JSONB,
  UNIQUE(object_id, relation_id)
);
ALTER TABLE public.object_relation_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own object values" ON public.object_relation_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.space_objects so WHERE so.id = object_id AND so.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.space_objects so WHERE so.id = object_id AND so.user_id = auth.uid()));

-- Sets (filtered views)
CREATE TABLE public.object_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  object_type_id UUID REFERENCES public.object_types(id),
  filters JSONB DEFAULT '[]'::jsonb,
  sorts JSONB DEFAULT '[]'::jsonb,
  view_type TEXT DEFAULT 'grid',
  visible_relations JSONB DEFAULT '[]'::jsonb,
  group_by_relation_id UUID REFERENCES public.relation_definitions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.object_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sets" ON public.object_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Space Widgets
CREATE TABLE public.space_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  widget_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.space_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own widgets" ON public.space_widgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
