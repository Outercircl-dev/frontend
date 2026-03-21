-- SIMPLIFIED MESSAGES FIX: Drop conflicting policies and recreate properly

-- Drop all conflicting policies first
DROP POLICY IF EXISTS "Message context profile access" ON public.profiles_public_secure;

-- Create simplified approach - update the ChatSection to use correct RPC call
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
  LEFT JOIN public.profiles p ON p.id = dm.other_user
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_conversations_secure(uuid, integer) TO authenticated;

-- Status check
SELECT 'MESSAGES FUNCTION FIX COMPLETED' as status;