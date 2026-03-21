-- Fix the search_path security issues by updating the functions

-- Update search_users function with SET search_path
CREATE OR REPLACE FUNCTION public.search_users(search_term text, requesting_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  avatar_url text,
  bio text,
  friendship_status text,
  reliability_rating numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    p.bio,
    CASE 
      WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN 'friends'
      WHEN f.id IS NOT NULL AND f.status = 'pending' AND f.requested_by = requesting_user_id THEN 'request_sent'
      WHEN f.id IS NOT NULL AND f.status = 'pending' AND f.requested_by != requesting_user_id THEN 'request_received'
      ELSE 'none'
    END as friendship_status,
    COALESCE(p.reliability_rating, 0) as reliability_rating
  FROM public.profiles p
  LEFT JOIN public.friendships f ON 
    ((f.user_id = p.id AND f.friend_id = requesting_user_id) OR
     (f.user_id = requesting_user_id AND f.friend_id = p.id))
  WHERE 
    p.id != requesting_user_id
    AND (
      CASE 
        WHEN search_term = '' THEN true
        ELSE (
          p.name ILIKE '%' || search_term || '%' OR 
          p.username ILIKE '%' || search_term || '%'
        )
      END
    )
  ORDER BY 
    CASE 
      WHEN f.status = 'accepted' THEN 1
      WHEN f.status = 'pending' THEN 2
      ELSE 3
    END,
    p.name
  LIMIT 20;
END;
$$;

-- Update get_user_friends function with SET search_path
CREATE OR REPLACE FUNCTION public.get_user_friends(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  username text,
  avatar_url text,
  reliability_rating numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.username,
    p.avatar_url,
    COALESCE(p.reliability_rating, 0) as reliability_rating
  FROM public.profiles p
  INNER JOIN public.friendships f ON 
    ((f.user_id = p.id AND f.friend_id = p_user_id) OR
     (f.user_id = p_user_id AND f.friend_id = p.id))
  WHERE 
    f.status = 'accepted'
    AND p.id != p_user_id
  ORDER BY p.name;
END;
$$;