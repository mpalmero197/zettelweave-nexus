-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('online', 'busy', 'away', 'dnd', 'offline');

-- Add visibility and status fields to profiles
ALTER TABLE public.profiles
ADD COLUMN is_visible BOOLEAN DEFAULT true,
ADD COLUMN user_status user_status DEFAULT 'offline',
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop and recreate search_users function with new return type
DROP FUNCTION IF EXISTS public.search_users(text);

CREATE FUNCTION public.search_users(_search_query text)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  display_name text, 
  avatar_url text, 
  is_friend boolean, 
  has_pending_request boolean,
  user_status user_status,
  last_activity_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    p.last_activity_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND COALESCE(p.is_visible, true) = true
    AND (
      au.email ILIKE '%' || _search_query || '%'
      OR p.display_name ILIKE '%' || _search_query || '%'
    )
  ORDER BY p.last_activity_at DESC NULLS LAST
  LIMIT 50;
END;
$$;

-- Function to get all visible users (for browsing all users)
CREATE FUNCTION public.get_all_visible_users()
RETURNS TABLE(
  user_id uuid, 
  email text, 
  display_name text, 
  avatar_url text, 
  is_friend boolean, 
  has_pending_request boolean,
  user_status user_status,
  last_activity_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    p.display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    p.last_activity_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND COALESCE(p.is_visible, true) = true
  ORDER BY 
    CASE 
      WHEN p.user_status IN ('online', 'busy', 'away') THEN 0
      WHEN p.user_status = 'dnd' THEN 1
      ELSE 2
    END,
    p.last_activity_at DESC NULLS LAST
  LIMIT 100;
END;
$$;

-- Drop and recreate get_my_friends with new return type
DROP FUNCTION IF EXISTS public.get_my_friends();

CREATE FUNCTION public.get_my_friends()
RETURNS TABLE(
  friend_user_id uuid, 
  friend_email text, 
  friend_display_name text, 
  friend_avatar_url text, 
  friendship_created_at timestamp with time zone,
  user_status user_status,
  last_activity_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id_1 = auth.uid() THEN f.user_id_2
      ELSE f.user_id_1
    END as friend_user_id,
    au.email as friend_email,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    f.created_at as friendship_created_at,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    p.last_activity_at
  FROM public.friendships f
  LEFT JOIN auth.users au ON (
    CASE 
      WHEN f.user_id_1 = auth.uid() THEN f.user_id_2
      ELSE f.user_id_1
    END = au.id
  )
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid()
  ORDER BY 
    CASE 
      WHEN p.user_status IN ('online', 'busy', 'away') THEN 0
      WHEN p.user_status = 'dnd' THEN 1
      ELSE 2
    END,
    f.created_at DESC;
END;
$$;

-- Enable realtime for profiles table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;