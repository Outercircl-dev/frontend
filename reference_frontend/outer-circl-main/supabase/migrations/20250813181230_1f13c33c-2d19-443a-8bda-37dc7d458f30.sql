-- COMPREHENSIVE MESSAGES FIX: Address authentication context and RLS issues

-- Step 1: Fix the RPC function authentication context issue
-- Drop the existing SECURITY DEFINER function and recreate without it
DROP FUNCTION IF EXISTS public.get_user_conversations_secure(integer);

-- Create new function that accepts user_id parameter (no SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_conversations_secure(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(
  conversation_id text,
  conversation_type text,
  other_user_id uuid,
  other_user_name text,
  other_user_avatar text,
  last_message_content text,
  last_message_at timestamp with time zone,
  unread_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH direct_messages AS (
    SELECT 
      CASE 
        WHEN m.sender_id = p_user_id THEN 'direct_' || m.recipient_id::text
        ELSE 'direct_' || m.sender_id::text
      END as conv_id,
      'direct' as conv_type,
      CASE 
        WHEN m.sender_id = p_user_id THEN m.recipient_id
        ELSE m.sender_id
      END as other_user,
      m.content as last_content,
      m.created_at as last_at,
      CASE WHEN m.sender_id != p_user_id AND m.read_at IS NULL THEN 1 ELSE 0 END as is_unread,
      ROW_NUMBER() OVER (
        PARTITION BY CASE 
          WHEN m.sender_id = p_user_id THEN m.recipient_id
          ELSE m.sender_id
        END 
        ORDER BY m.created_at DESC
      ) as rn
    FROM public.messages m
    WHERE m.message_type = 'direct'
      AND (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_deleted_messages udm 
        WHERE udm.user_id = p_user_id AND udm.message_id = m.id
      )
  )
  SELECT 
    dm.conv_id,
    dm.conv_type,
    dm.other_user,
    COALESCE(p.name, p.username, 'Unknown User') as other_name,
    p.avatar_url,
    dm.last_content,
    dm.last_at,
    SUM(dm.is_unread)::bigint as unread_total
  FROM direct_messages dm
  LEFT JOIN public.profiles_public_secure p ON p.id = dm.other_user
  WHERE dm.rn = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.user_deleted_conversations udc 
      WHERE udc.user_id = p_user_id AND udc.conversation_id = dm.conv_id
    )
  GROUP BY dm.conv_id, dm.conv_type, dm.other_user, p.name, p.username, p.avatar_url, dm.last_content, dm.last_at
  ORDER BY dm.last_at DESC
  LIMIT p_limit;
END;
$$;

-- Step 2: Fix event message RLS policy to include event hosts
DROP POLICY IF EXISTS "Event participants can view event messages" ON public.messages;

CREATE POLICY "Event participants and hosts can view event messages" 
ON public.messages 
FOR SELECT 
USING (
  (message_type = 'event') 
  AND (event_id IS NOT NULL) 
  AND (
    -- Allow event participants who are attending
    EXISTS (
      SELECT 1 FROM public.event_participants ep
      WHERE ep.event_id = messages.event_id 
        AND ep.user_id = auth.uid() 
        AND ep.status = 'attending'
    )
    OR
    -- Allow event hosts (even if not marked as attending)
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = messages.event_id 
        AND e.host_id = auth.uid()
    )
  )
);

-- Step 3: Create a more permissive profile policy for message contexts
CREATE POLICY "Message context profile access" 
ON public.profiles_public_secure 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND (
    -- Own profile
    (auth.uid() = id) OR
    -- Public profiles
    (EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = profiles_public_secure.id 
        AND pps.profile_visibility = 'public'
    )) OR
    -- Friends (followers visibility)
    (
      (EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = profiles_public_secure.id 
          AND pps.profile_visibility = 'followers'
      )) AND
      (EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = profiles_public_secure.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = profiles_public_secure.id))
          AND f.status = 'accepted'
      ))
    ) OR
    -- Users in same conversation (message context)
    (EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
        AND (m.sender_id = profiles_public_secure.id OR m.recipient_id = profiles_public_secure.id)
    )) OR
    -- Users in same event conversation
    (EXISTS (
      SELECT 1 FROM public.messages m1
      JOIN public.messages m2 ON m1.event_id = m2.event_id
      WHERE m1.sender_id = auth.uid() 
        AND m2.sender_id = profiles_public_secure.id
        AND m1.message_type = 'event'
        AND m2.message_type = 'event'
    ))
  )
);

-- Step 4: Create helper function for message archiving
CREATE OR REPLACE FUNCTION public.archive_conversation(p_conversation_id text, p_conversation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Archive conversation by adding to user_deleted_conversations
  INSERT INTO public.user_deleted_conversations (user_id, conversation_id, conversation_type)
  VALUES (auth.uid(), p_conversation_id, p_conversation_type)
  ON CONFLICT (user_id, conversation_id, conversation_type) DO NOTHING;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_conversation(p_conversation_id text, p_conversation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Unarchive conversation by removing from user_deleted_conversations
  DELETE FROM public.user_deleted_conversations 
  WHERE user_id = auth.uid() 
    AND conversation_id = p_conversation_id 
    AND conversation_type = p_conversation_type;
  
  RETURN true;
END;
$$;

-- Step 5: Add debugging function to check message visibility
CREATE OR REPLACE FUNCTION public.debug_message_access(p_user_id uuid)
RETURNS TABLE(
  check_type text,
  result text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'auth_check'::text,
    CASE WHEN auth.uid() IS NOT NULL THEN 'authenticated' ELSE 'not_authenticated' END::text,
    jsonb_build_object('auth_uid', auth.uid(), 'provided_user_id', p_user_id)
  
  UNION ALL
  
  SELECT 
    'profile_access'::text,
    CASE WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN 'profile_exists' ELSE 'no_profile' END::text,
    jsonb_build_object('user_id', p_user_id)
  
  UNION ALL
  
  SELECT 
    'message_count'::text,
    (SELECT COUNT(*)::text FROM public.messages WHERE sender_id = p_user_id OR recipient_id = p_user_id)::text,
    jsonb_build_object('direct_count', (SELECT COUNT(*) FROM public.messages WHERE (sender_id = p_user_id OR recipient_id = p_user_id) AND message_type = 'direct'), 'event_count', (SELECT COUNT(*) FROM public.messages WHERE sender_id = p_user_id AND message_type = 'event'))
  
  UNION ALL
  
  SELECT 
    'deleted_conversations'::text,
    (SELECT COUNT(*)::text FROM public.user_deleted_conversations WHERE user_id = p_user_id)::text,
    jsonb_build_object('count', (SELECT COUNT(*) FROM public.user_deleted_conversations WHERE user_id = p_user_id));
END;
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_conversations_secure(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_conversation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_conversation(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_message_access(uuid) TO authenticated;

-- Final status check
SELECT 'MESSAGES FIX COMPLETED: Authentication context fixed, RLS policies updated, archiving functions added' as status;