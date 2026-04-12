
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  estimated_time INTEGER DEFAULT 30,
  actual_time INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  start_time BIGINT,
  completed_at TIMESTAMPTZ,
  list TEXT DEFAULT 'default',
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurrence_pattern TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
