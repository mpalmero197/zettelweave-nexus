-- Enable realtime for scratchpad_notes so changes sync instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.scratchpad_notes;