-- Tighten presence SELECT policy
DROP POLICY IF EXISTS "Anyone with share access can read presence" ON public.item_presence;

CREATE POLICY "Owner or shared users can read presence"
  ON public.item_presence FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_share_access(item_type, item_id, 'view')
    OR EXISTS (
      SELECT 1 FROM public.shared_items si
      WHERE si.item_type = item_presence.item_type
        AND si.item_id = item_presence.item_id
        AND si.owner_id = auth.uid()
    )
  );