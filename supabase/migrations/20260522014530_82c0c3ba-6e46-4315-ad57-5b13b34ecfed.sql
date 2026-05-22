DROP POLICY IF EXISTS "Service role inserts pulses" ON public.alice_pulses;
CREATE POLICY "Users insert own pulses" ON public.alice_pulses
  FOR INSERT WITH CHECK (auth.uid() = user_id);