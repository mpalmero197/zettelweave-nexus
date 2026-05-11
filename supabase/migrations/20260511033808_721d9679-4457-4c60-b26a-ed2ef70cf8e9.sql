
CREATE TABLE public.jarvis_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jarvis_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads select" ON public.jarvis_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own threads insert" ON public.jarvis_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own threads update" ON public.jarvis_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own threads delete" ON public.jarvis_threads FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_jarvis_threads_user ON public.jarvis_threads(user_id, updated_at DESC);
CREATE TRIGGER jarvis_threads_updated_at BEFORE UPDATE ON public.jarvis_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.jarvis_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.jarvis_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jarvis_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jarvis msgs select" ON public.jarvis_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own jarvis msgs insert" ON public.jarvis_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own jarvis msgs delete" ON public.jarvis_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_jarvis_messages_thread ON public.jarvis_messages(thread_id, created_at);
