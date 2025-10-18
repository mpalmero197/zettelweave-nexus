-- Add RLS policy to allow users to view their own roles
CREATE POLICY "Users can view own role"
ON public.user_roles 
FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));