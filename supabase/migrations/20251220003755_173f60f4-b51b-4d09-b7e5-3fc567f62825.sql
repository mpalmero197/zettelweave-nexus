-- Fix search_users SQL injection vulnerability by escaping LIKE wildcards
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
SET search_path TO 'public'
AS $function$
DECLARE
  _sanitized_query text;
BEGIN
  -- Escape special LIKE characters to prevent pattern injection
  _sanitized_query := REPLACE(REPLACE(REPLACE(_search_query, '\', '\\'), '%', '\%'), '_', '\_');
  
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
      LOWER(au.email) LIKE LOWER('%' || _sanitized_query || '%') ESCAPE '\'
      OR LOWER(COALESCE(p.display_name, '')) LIKE LOWER('%' || _sanitized_query || '%') ESCAPE '\'
      OR LOWER(COALESCE(au.raw_user_meta_data->>'display_name', '')) LIKE LOWER('%' || _sanitized_query || '%') ESCAPE '\'
    )
  ORDER BY 
    CASE 
      WHEN LOWER(au.email) = LOWER(_search_query) THEN 0
      WHEN LOWER(COALESCE(p.display_name, '')) = LOWER(_search_query) THEN 0
      WHEN LOWER(au.email) LIKE LOWER(_sanitized_query || '%') ESCAPE '\' THEN 1
      WHEN LOWER(COALESCE(p.display_name, '')) LIKE LOWER(_sanitized_query || '%') ESCAPE '\' THEN 1
      ELSE 2
    END,
    COALESCE(p.last_activity_at, au.last_sign_in_at, au.created_at) DESC
  LIMIT 50;
END;
$function$;