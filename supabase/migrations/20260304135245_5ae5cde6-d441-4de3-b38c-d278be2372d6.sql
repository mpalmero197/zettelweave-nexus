
-- Fix broken RLS policies on catalyst_documents that reference cc.document_id = cc.id (should be catalyst_documents.id)
DROP POLICY IF EXISTS "Collaborators can view shared documents" ON catalyst_documents;
DROP POLICY IF EXISTS "Collaborators with edit can update shared documents" ON catalyst_documents;

CREATE POLICY "Collaborators can view shared documents"
ON catalyst_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM catalyst_collaborators cc
    WHERE cc.document_id = catalyst_documents.id
      AND cc.collaborator_id = auth.uid()
      AND cc.status = 'accepted'
  )
);

CREATE POLICY "Collaborators with edit can update shared documents"
ON catalyst_documents FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM catalyst_collaborators cc
    WHERE cc.document_id = catalyst_documents.id
      AND cc.collaborator_id = auth.uid()
      AND cc.status = 'accepted'
      AND cc.permission = 'edit'
  )
);
