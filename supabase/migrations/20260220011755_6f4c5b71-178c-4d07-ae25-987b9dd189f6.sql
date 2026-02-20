
-- Add parent_task_id to project_tasks for subtask nesting
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.project_tasks(id) ON DELETE CASCADE;

-- Index for fast parent lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent ON public.project_tasks(parent_task_id);
