CREATE TABLE public.alice_deck_context_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deck_id UUID NOT NULL REFERENCES public.alice_decks(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL DEFAULT 'url_prefix',
  match_value TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_deck_context_rules TO authenticated;
GRANT ALL ON public.alice_deck_context_rules TO service_role;

ALTER TABLE public.alice_deck_context_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their context rules"
  ON public.alice_deck_context_rules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX alice_deck_context_rules_user_idx ON public.alice_deck_context_rules(user_id, enabled, priority);
CREATE INDEX alice_deck_context_rules_deck_idx ON public.alice_deck_context_rules(deck_id);

CREATE TRIGGER trg_alice_deck_context_rules_updated
  BEFORE UPDATE ON public.alice_deck_context_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();