ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS repeat_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS repeat_until date;