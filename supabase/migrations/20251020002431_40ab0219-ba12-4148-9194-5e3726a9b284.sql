-- Create a function to clear all links for a user's cards
CREATE OR REPLACE FUNCTION public.clear_all_card_links()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cards_updated integer;
BEGIN
  -- Update all cards for the current user to have empty linked_cards array
  UPDATE public.zettel_cards
  SET linked_cards = '{}',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS cards_updated = ROW_COUNT;
  
  RETURN cards_updated;
END;
$$;