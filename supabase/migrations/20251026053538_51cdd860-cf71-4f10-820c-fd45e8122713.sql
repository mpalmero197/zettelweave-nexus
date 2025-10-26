-- Improve search_users function for better partial matching
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
      LOWER(au.email) LIKE LOWER('%' || _search_query || '%')
      OR LOWER(COALESCE(p.display_name, '')) LIKE LOWER('%' || _search_query || '%')
      OR LOWER(au.raw_user_meta_data->>'display_name') LIKE LOWER('%' || _search_query || '%')
    )
  ORDER BY 
    CASE 
      WHEN LOWER(au.email) = LOWER(_search_query) THEN 0
      WHEN LOWER(p.display_name) = LOWER(_search_query) THEN 0
      WHEN LOWER(au.email) LIKE LOWER(_search_query || '%') THEN 1
      WHEN LOWER(p.display_name) LIKE LOWER(_search_query || '%') THEN 1
      ELSE 2
    END,
    p.last_activity_at DESC NULLS LAST
  LIMIT 50;
END;
$$;

-- Improve get_all_visible_users for better results
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
    au.email,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name') as display_name,
    p.avatar_url,
    public.are_friends(auth.uid(), au.id) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE ((fr.sender_id = auth.uid() AND fr.receiver_id = au.id)
         OR (fr.sender_id = au.id AND fr.receiver_id = auth.uid()))
        AND fr.status = 'pending'
    ) as has_pending_request,
    COALESCE(p.user_status, 'offline'::user_status) as user_status,
    COALESCE(p.last_activity_at, au.created_at) as last_activity_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  WHERE au.id != auth.uid()
    AND COALESCE(p.is_visible, true) = true
    AND au.email_confirmed_at IS NOT NULL
  ORDER BY 
    CASE 
      WHEN p.user_status IN ('online', 'busy', 'away') THEN 0
      WHEN p.user_status = 'dnd' THEN 1
      ELSE 2
    END,
    COALESCE(p.last_activity_at, au.created_at) DESC
  LIMIT 100;
END;
$$;