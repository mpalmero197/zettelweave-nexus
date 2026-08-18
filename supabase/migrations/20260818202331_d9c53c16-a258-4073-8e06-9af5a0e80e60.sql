DROP POLICY IF EXISTS "signed-in can read live share by code" ON public.alice_deck_shares;

CREATE OR REPLACE FUNCTION public.resolve_deck_share(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share record;
  _deck record;
  _tiles jsonb;
BEGIN
  IF _code IS NULL OR length(trim(_code)) < 4 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _share
  FROM public.alice_deck_shares
  WHERE code = upper(trim(_code))
    AND expires_at > now()
  LIMIT 1;

  IF _share IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _deck FROM public.alice_decks WHERE id = _share.deck_id;
  IF _deck IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO _tiles
  FROM public.alice_deck_tiles t
  WHERE t.deck_id = _share.deck_id;

  RETURN jsonb_build_object(
    'deck_id', _share.deck_id,
    'expires_at', _share.expires_at,
    'deck', to_jsonb(_deck),
    'tiles', _tiles
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_deck_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_deck_share(text) TO anon, authenticated;