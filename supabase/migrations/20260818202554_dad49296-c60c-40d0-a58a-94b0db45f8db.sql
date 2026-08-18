GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_events TO authenticated;
GRANT ALL ON public.habit_events TO service_role;

CREATE POLICY "users read own habit events" ON public.habit_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own habit events" ON public.habit_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own habit events" ON public.habit_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own habit events" ON public.habit_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);