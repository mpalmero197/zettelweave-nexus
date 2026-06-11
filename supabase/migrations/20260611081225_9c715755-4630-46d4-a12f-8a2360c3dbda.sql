
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_link_mode text NOT NULL DEFAULT 'auto'
  CHECK (auto_link_mode IN ('auto','suggest','manual'));

ALTER TABLE public.zettel_cards
  ADD COLUMN IF NOT EXISTS suggested_links uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.alice_set_suggested_links(_card_id uuid, _link_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.zettel_cards
     SET suggested_links = _link_ids,
         auto_linked_at = now()
   WHERE id = _card_id;
END;
$$;
