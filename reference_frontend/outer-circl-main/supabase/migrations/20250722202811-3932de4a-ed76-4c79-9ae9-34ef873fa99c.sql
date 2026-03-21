-- Fix the search_users function by including ORDER BY expressions in SELECT list
CREATE OR REPLACE FUNCTION public.search_users(search_term text, requesting_user_id uuid)
RETURNS TABLE(id uuid, name text, username text, avatar_url text, bio text, friendship_status text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    p.bio,
    CASE 
      WHEN f.status IS NOT NULL THEN f.status
      WHEN f2.status IS NOT NULL THEN f2.status
      ELSE 'none'
    END as friendship_status
  FROM public.profiles p
  LEFT JOIN public.friendships f ON (
    (f.user_id = p.id AND f.friend_id = requesting_user_id) OR
    (f.user_id = requesting_user_id AND f.friend_id = p.id)
  )
  LEFT JOIN public.friendships f2 ON (
    (f2.user_id = requesting_user_id AND f2.friend_id = p.id) OR
    (f2.user_id = p.id AND f2.friend_id = requesting_user_id)
  )
  WHERE 
    p.account_status = 'active'
    AND p.id != requesting_user_id
    AND (
      LOWER(p.name) LIKE LOWER('%' || search_term || '%') OR
      LOWER(p.username) LIKE LOWER('%' || search_term || '%')
    )
    AND can_view_profile(p.id, requesting_user_id)
  ORDER BY 
    p.name;
END;
$function$;