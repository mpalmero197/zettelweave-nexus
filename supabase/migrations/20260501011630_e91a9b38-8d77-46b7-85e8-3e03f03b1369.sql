-- Drop and recreate the admin ALL policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Restrictive defense-in-depth: block any INSERT unless caller is admin
CREATE POLICY "Restrict role inserts to admins"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Restrictive: block any UPDATE unless caller is admin
CREATE POLICY "Restrict role updates to admins"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Restrictive: block any DELETE unless caller is admin
CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));