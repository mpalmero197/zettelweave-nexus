
-- Add soft delete columns to catalyst_documents
ALTER TABLE public.catalyst_documents
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS permanent_delete_at timestamp with time zone DEFAULT NULL;

-- Create catalyst_collaborators table for document sharing
CREATE TABLE public.catalyst_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.catalyst_documents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  collaborator_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (document_id, collaborator_id)
);

-- Enable RLS
ALTER TABLE public.catalyst_collaborators ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their collaborator invites
CREATE POLICY "Owners can manage collaborators"
ON public.catalyst_collaborators
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Collaborators can view invites sent to them
CREATE POLICY "Collaborators can view their invites"
ON public.catalyst_collaborators
FOR SELECT
USING (auth.uid() = collaborator_id);

-- Collaborators can accept/decline invites
CREATE POLICY "Collaborators can update their invite status"
ON public.catalyst_collaborators
FOR UPDATE
USING (auth.uid() = collaborator_id);

-- Update RLS on catalyst_documents to allow collaborators to view shared docs
CREATE POLICY "Collaborators can view shared documents"
ON public.catalyst_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
  )
);

-- Collaborators with edit permission can update shared docs
CREATE POLICY "Collaborators with edit can update shared documents"
ON public.catalyst_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
    AND cc.permission = 'edit'
  )
);

-- Allow collaborators to view chapters of shared documents
CREATE POLICY "Collaborators can view shared chapters"
ON public.catalyst_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = catalyst_chapters.document_id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
  )
);

-- Allow collaborators with edit to modify chapters
CREATE POLICY "Collaborators with edit can update shared chapters"
ON public.catalyst_chapters
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = catalyst_chapters.document_id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
    AND cc.permission = 'edit'
  )
);

-- Allow collaborators with edit to insert chapters
CREATE POLICY "Collaborators with edit can insert chapters"
ON public.catalyst_chapters
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = catalyst_chapters.document_id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
    AND cc.permission = 'edit'
  )
);

-- Allow collaborators to view/add comments
CREATE POLICY "Collaborators can view shared comments"
ON public.catalyst_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = catalyst_comments.document_id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
  )
);

CREATE POLICY "Collaborators with comment or edit can add comments"
ON public.catalyst_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.catalyst_collaborators cc
    WHERE cc.document_id = catalyst_comments.document_id
    AND cc.collaborator_id = auth.uid()
    AND cc.status = 'accepted'
    AND cc.permission IN ('comment', 'edit')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_catalyst_collaborators_updated_at
BEFORE UPDATE ON public.catalyst_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
