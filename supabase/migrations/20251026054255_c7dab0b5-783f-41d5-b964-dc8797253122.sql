-- Fix type mismatch in get_all_visible_users - cast email to text
CREATE OR REPLACE FUNCTION public.get_all_visible_users()
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
    au.email::text,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name', SPLIT_PART(au.email, '@', 1)) as display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) as last_activity_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND au.email_confirmed_at IS NOT NULL
    AND (au.banned_until IS NULL OR au.banned_until < NOW())
    AND (p.is_visible IS NULL OR p.is_visible = true)
  ORDER BY 
    CASE 
      WHEN p.user_status IN ('online', 'busy', 'away') THEN 0
      WHEN p.user_status = 'dnd' THEN 1
      ELSE 2
    END,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) DESC
  LIMIT 100;
END;
$$;

-- Fix type mismatch in search_users - cast email to text
CREATE OR REPLACE FUNCTION public.search_users(_search_query text)
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
    au.email::text,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name', SPLIT_PART(au.email, '@', 1)) as display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) as last_activity_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND au.email_confirmed_at IS NOT NULL
    AND (au.banned_until IS NULL OR au.banned_until < NOW())
    AND (p.is_visible IS NULL OR p.is_visible = true)
    AND (
      LOWER(au.email) LIKE LOWER('%' || _search_query || '%')
      OR LOWER(COALESCE(p.display_name, '')) LIKE LOWER('%' || _search_query || '%')
      OR LOWER(COALESCE(au.raw_user_meta_data->>'display_name', '')) LIKE LOWER('%' || _search_query || '%')
    )
  ORDER BY 
    CASE 
      WHEN LOWER(au.email) = LOWER(_search_query) THEN 0
      WHEN LOWER(COALESCE(p.display_name, '')) = LOWER(_search_query) THEN 0
      WHEN LOWER(au.email) LIKE LOWER(_search_query || '%') THEN 1
      WHEN LOWER(COALESCE(p.display_name, '')) LIKE LOWER(_search_query || '%') THEN 1
      ELSE 2
    END,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) DESC
  LIMIT 50;
END;
$$;

-- Fix type mismatch in get_my_friends - cast email to text
CREATE OR REPLACE FUNCTION public.get_my_friends()
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
    au.email::text as friend_email,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    f.created_at as friendship_created_at,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) as last_activity_at
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