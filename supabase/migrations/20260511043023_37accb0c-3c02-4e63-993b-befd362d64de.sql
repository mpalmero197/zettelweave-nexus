-- ALICE long-term memories
CREATE TABLE public.alice_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('preference','fact','project','person','rule')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alice_memories_user ON public.alice_memories(user_id);
CREATE INDEX idx_alice_memories_user_kind ON public.alice_memories(user_id, kind);
ALTER TABLE public.alice_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alice_memories_select_own" ON public.alice_memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alice_memories_insert_own" ON public.alice_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alice_memories_update_own" ON public.alice_memories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alice_memories_delete_own" ON public.alice_memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_alice_memories_updated
  BEFORE UPDATE ON public.alice_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ALICE action plans (with undo)
CREATE TABLE public.alice_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  summary TEXT NOT NULL,
  plan_jsonb JSONB NOT NULL,
  executed_steps_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  undo_payload_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_confirm'
    CHECK (status IN ('pending_confirm','running','done','failed','undone','cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_alice_actions_user ON public.alice_actions(user_id, created_at DESC);
ALTER TABLE public.alice_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alice_actions_select_own" ON public.alice_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alice_actions_insert_own" ON public.alice_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alice_actions_update_own" ON public.alice_actions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alice_actions_delete_own" ON public.alice_actions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_alice_actions_updated
  BEFORE UPDATE ON public.alice_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ALICE daily briefings
CREATE TABLE public.alice_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  for_date DATE NOT NULL,
  summary_md TEXT NOT NULL,
  highlights_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, for_date)
);
CREATE INDEX idx_alice_briefings_user_date ON public.alice_briefings(user_id, for_date DESC);
ALTER TABLE public.alice_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alice_briefings_select_own" ON public.alice_briefings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alice_briefings_insert_own" ON public.alice_briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alice_briefings_update_own" ON public.alice_briefings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alice_briefings_delete_own" ON public.alice_briefings
  FOR DELETE USING (auth.uid() = user_id);