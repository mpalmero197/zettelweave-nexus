ALTER TABLE public.scratchpad_notes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scratchpad_notes TO authenticated;
GRANT ALL ON public.scratchpad_notes TO service_role;

DROP POLICY IF EXISTS "Users can create their own scratchpad notes" ON public.scratchpad_notes;
CREATE POLICY "Users can create their own scratchpad notes"
ON public.scratchpad_notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own scratchpad notes" ON public.scratchpad_notes;
CREATE POLICY "Users can view their own scratchpad notes"
ON public.scratchpad_notes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scratchpad notes" ON public.scratchpad_notes;
CREATE POLICY "Users can update their own scratchpad notes"
ON public.scratchpad_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scratchpad notes" ON public.scratchpad_notes;
CREATE POLICY "Users can delete their own scratchpad notes"
ON public.scratchpad_notes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);