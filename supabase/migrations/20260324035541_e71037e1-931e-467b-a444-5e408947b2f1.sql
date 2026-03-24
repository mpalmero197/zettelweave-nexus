
-- Add title/role configuration to projects
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS title_mode text NOT NULL DEFAULT 'free_text',
  ADD COLUMN IF NOT EXISTS custom_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS industry text;

-- Add title, permissions, and hierarchy to project_collaborators
ALTER TABLE public.project_collaborators
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS can_assign_tasks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hierarchy_level integer NOT NULL DEFAULT 0;

-- Add task assignment to project_tasks
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid;
