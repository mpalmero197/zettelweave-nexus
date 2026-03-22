-- Project collaborators table
CREATE TABLE public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  collaborator_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'accepted',
  invited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, collaborator_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage project collaborators"
  ON public.project_collaborators FOR ALL
  TO public
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Collaborators can view their project invites"
  ON public.project_collaborators FOR SELECT
  TO public
  USING (auth.uid() = collaborator_id);

CREATE POLICY "Collaborators can view shared projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = projects.id
    AND pc.collaborator_id = auth.uid()
    AND pc.status = 'accepted'
  ));

CREATE POLICY "Collaborators can view shared project tasks"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = project_tasks.project_id
    AND pc.collaborator_id = auth.uid()
    AND pc.status = 'accepted'
  ));

CREATE POLICY "Collaborators can view shared project milestones"
  ON public.project_milestones FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_collaborators pc
    WHERE pc.project_id = project_milestones.project_id
    AND pc.collaborator_id = auth.uid()
    AND pc.status = 'accepted'
  ));