-- Add DELETE policy for dashboard_layouts table
CREATE POLICY "Users can delete their own dashboard layout"
ON public.dashboard_layouts
FOR DELETE
USING (auth.uid() = user_id);