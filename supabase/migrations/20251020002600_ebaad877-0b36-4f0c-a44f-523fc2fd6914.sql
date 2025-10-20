-- Enable realtime for zettel_cards table
ALTER TABLE public.zettel_cards REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.zettel_cards;