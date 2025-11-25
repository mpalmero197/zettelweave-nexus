-- Add is_favorite column to documents table
ALTER TABLE public.documents
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add is_favorite column to project_tasks table
ALTER TABLE public.project_tasks
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster queries on favorites
CREATE INDEX idx_documents_favorite ON public.documents(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_project_tasks_favorite ON public.project_tasks(user_id, is_favorite) WHERE is_favorite = true;