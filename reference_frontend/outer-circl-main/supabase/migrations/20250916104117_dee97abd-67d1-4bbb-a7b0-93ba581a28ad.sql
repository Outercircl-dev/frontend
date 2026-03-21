-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.search_users(text, uuid);
DROP FUNCTION IF EXISTS public.get_user_friends(uuid);

-- Create search_users function
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
SET search_path = public
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

-- Create get_user_friends function
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
SET search_path = public
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

-- Function to send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  existing_friendship_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to send friend requests';
  END IF;
  
  -- Can't send request to yourself
  IF current_user_id = friend_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  -- Check if friendship already exists
  SELECT id INTO existing_friendship_id
  FROM public.friendships
  WHERE ((user_id = current_user_id AND friend_id = send_friend_request.friend_id) OR
         (user_id = send_friend_request.friend_id AND friend_id = current_user_id));
         
  IF existing_friendship_id IS NOT NULL THEN
    RAISE EXCEPTION 'Friendship relationship already exists';
  END IF;
  
  -- Insert new friend request
  INSERT INTO public.friendships (user_id, friend_id, status, requested_by)
  VALUES (current_user_id, friend_id, 'pending', current_user_id);
  
  RETURN true;
END;
$$;

-- Function to respond to friend request
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(friendship_id uuid, response text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  friendship_record RECORD;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to respond to friend requests';
  END IF;
  
  -- Validate response
  IF response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Response must be either accepted or declined';
  END IF;
  
  -- Get the friendship record
  SELECT * INTO friendship_record
  FROM public.friendships
  WHERE id = friendship_id
    AND (user_id = current_user_id OR friend_id = current_user_id)
    AND status = 'pending';
    
  IF friendship_record.id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
  
  -- Make sure current user is the recipient (not the sender)
  IF friendship_record.requested_by = current_user_id THEN
    RAISE EXCEPTION 'Cannot respond to your own friend request';
  END IF;
  
  -- Update the friendship status
  IF response = 'accepted' THEN
    UPDATE public.friendships
    SET status = 'accepted', updated_at = now()
    WHERE id = friendship_id;
  ELSE
    -- Delete the friendship record for declined requests
    DELETE FROM public.friendships
    WHERE id = friendship_id;
  END IF;
  
  RETURN true;
END;
$$;