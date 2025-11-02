-- Fix profiles visibility for Collab feature
-- Drop the restrictive policy and create a new one that allows viewing visible profiles

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow users to view their own profile and other users' visible profiles
CREATE POLICY "Users can view visible profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = user_id OR 
    (is_visible = true AND user_id IS NOT NULL)
  );

-- Ensure profiles table has REPLICA IDENTITY FULL for realtime
ALTER TABLE public.profiles REPLICA IDENTITY FULL;