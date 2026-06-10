
ALTER TABLE public.zettel_cards
  ADD COLUMN IF NOT EXISTS links_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_linked_at timestamptz;

-- Trigger: if linked_cards changed and the session is NOT an ALICE write, lock the card.
CREATE OR REPLACE FUNCTION public.zettel_cards_lock_on_user_link_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alice_flag text;
BEGIN
  -- ALICE sets this session var before writing
  v_alice_flag := current_setting('app.alice_auto_link', true);

  IF (COALESCE(NEW.linked_cards, '{}'::uuid[]) IS DISTINCT FROM COALESCE(OLD.linked_cards, '{}'::uuid[]))
     AND COALESCE(v_alice_flag, '') <> 'true' THEN
    NEW.links_locked := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zettel_cards_lock_on_user_link_change ON public.zettel_cards;
CREATE TRIGGER trg_zettel_cards_lock_on_user_link_change
BEFORE UPDATE OF linked_cards ON public.zettel_cards
FOR EACH ROW EXECUTE FUNCTION public.zettel_cards_lock_on_user_link_change();

-- ALICE helper: write auto-links without flipping the lock
CREATE OR REPLACE FUNCTION public.alice_set_auto_links(
  _card_id uuid,
  _link_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.alice_auto_link', 'true', true);
  UPDATE public.zettel_cards
     SET linked_cards = _link_ids,
         auto_linked_at = now()
   WHERE id = _card_id
     AND links_locked = false;
END;
$$;

-- "Unlock" / reset to auto-managed
CREATE OR REPLACE FUNCTION public.unlock_card_auto_links(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.zettel_cards
     SET links_locked = false
   WHERE id = _card_id
     AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_card_auto_links(uuid) TO authenticated;
-- alice_set_auto_links is service-role only (no grant to authenticated)
