-- Create secure RPC to fetch user conversations with safe profile fallbacks
CREATE OR REPLACE FUNCTION public.get_user_conversations_secure(p_limit integer DEFAULT 50)
RETURNS TABLE (
  conversation_id text,
  conversation_type text,
  other_user_id uuid,
  event_id uuid,
  last_message_content text,
  last_message_at timestamptz,
  unread_count integer,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH dm AS (
    SELECT
      CASE 
        WHEN m.sender_id < m.recipient_id THEN m.sender_id::text || '|' || m.recipient_id::text
        ELSE m.recipient_id::text || '|' || m.sender_id::text
      END AS conv_id,
      CASE WHEN m.sender_id = uid THEN m.recipient_id ELSE m.sender_id END AS other_id,
      max(m.created_at) AS last_at,
      (ARRAY_AGG(m.content ORDER BY m.created_at DESC))[1] AS last_content
    FROM public.messages m
    WHERE m.message_type = 'direct'
      AND (m.sender_id = uid OR m.recipient_id = uid)
    GROUP BY conv_id, other_id
  ),
  unread AS (
    SELECT
      CASE 
        WHEN m.sender_id < m.recipient_id THEN m.sender_id::text || '|' || m.recipient_id::text
        ELSE m.recipient_id::text || '|' || m.sender_id::text
      END AS conv_id,
      count(*)::int AS cnt
    FROM public.messages m
    WHERE m.message_type = 'direct'
      AND m.recipient_id = uid
      AND m.read_at IS NULL
    GROUP BY conv_id
  ),
  profiles AS (
    SELECT pps.id, COALESCE(pps.name, pps.username, 'User') AS name, pps.avatar_url
    FROM public.profiles_public_secure pps
  )
  SELECT 
    dm.conv_id AS conversation_id,
    'direct' AS conversation_type,
    dm.other_id AS other_user_id,
    NULL::uuid AS event_id,
    dm.last_content AS last_message_content,
    dm.last_at AS last_message_at,
    COALESCE(u.cnt, 0) AS unread_count,
    COALESCE(pr.name, 'User') AS display_name,
    pr.avatar_url
  FROM dm
  LEFT JOIN unread u ON u.conv_id = dm.conv_id
  LEFT JOIN profiles pr ON pr.id = dm.other_id
  ORDER BY dm.last_at DESC
  LIMIT p_limit;
END;
$$;

-- Helpful performance indexes for messages lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created_at ON public.messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_event_created_at ON public.messages (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id, read_at);
