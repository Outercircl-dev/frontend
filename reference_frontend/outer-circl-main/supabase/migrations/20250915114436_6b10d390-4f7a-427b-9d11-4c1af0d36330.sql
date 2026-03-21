-- Fix 1: Update database functions to use immutable search_path for security
-- This prevents SQL injection vulnerabilities in function execution

-- Update functions that are missing proper search_path settings
CREATE OR REPLACE FUNCTION public.is_friends_with(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1 AND f.friend_id = user2) OR
           (f.user_id = user2 AND f.friend_id = user1))
    AND f.status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_admin(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id 
    AND ms.admin_user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = p_subscription_id 
    AND ms.user_id = p_user_id
    AND ms.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.wants_email_notifications(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(pps.email_notifications, true)
  FROM public.profile_privacy_settings pps
  WHERE pps.user_id = p_user_id;
$$;

-- Fix 2: Create optimized conversation retrieval function with proper security
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
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only allow users to get their own conversations
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only access your own conversations';
  END IF;
  
  -- Return direct message conversations with optimized query
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (
      CASE 
        WHEN m.sender_id = p_user_id THEN m.recipient_id 
        ELSE m.sender_id 
      END
    )
    CASE 
      WHEN m.sender_id = p_user_id THEN m.recipient_id 
      ELSE m.sender_id 
    END as other_user_id,
    m.content as last_message_content,
    m.created_at as last_message_at
    FROM public.messages m
    WHERE m.message_type = 'direct'
    AND (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_deleted_messages udm 
      WHERE udm.user_id = p_user_id AND udm.message_id = m.id
    )
    ORDER BY 
      CASE 
        WHEN m.sender_id = p_user_id THEN m.recipient_id 
        ELSE m.sender_id 
      END,
      m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.sender_id as other_user_id,
      COUNT(*) as unread_count
    FROM public.messages m
    WHERE m.recipient_id = p_user_id 
    AND m.message_type = 'direct'
    AND m.read_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_deleted_messages udm 
      WHERE udm.user_id = p_user_id AND udm.message_id = m.id
    )
    GROUP BY m.sender_id
  )
  SELECT 
    'direct_' || lm.other_user_id::text as conversation_id,
    'direct' as conversation_type,
    lm.other_user_id,
    COALESCE(pps.name, pps.username, 'Unknown User') as other_user_name,
    pps.avatar_url as other_user_avatar,
    lm.last_message_content,
    lm.last_message_at,
    COALESCE(uc.unread_count, 0) as unread_count
  FROM latest_messages lm
  LEFT JOIN public.profiles_public_secure pps ON pps.id = lm.other_user_id
  LEFT JOIN unread_counts uc ON uc.other_user_id = lm.other_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_deleted_conversations udc 
    WHERE udc.user_id = p_user_id 
    AND udc.conversation_id = lm.other_user_id::text
    AND udc.conversation_type = 'direct'
  )
  ORDER BY lm.last_message_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix 3: Add security monitoring function with proper access control
CREATE OR REPLACE FUNCTION public.log_security_access_attempt(
  p_table_name text,
  p_operation text,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  -- Insert security audit record
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    risk_score,
    metadata,
    timestamp,
    ip_address
  ) VALUES (
    auth.uid(),
    p_operation,
    p_table_name,
    CASE WHEN NOT p_success THEN 7 ELSE 1 END,
    jsonb_build_object(
      'operation', p_operation,
      'table', p_table_name,
      'success', p_success,
      'error_message', p_error_message,
      'timestamp', now()
    ),
    now(),
    inet_client_addr()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to prevent blocking operations
    NULL;
END;
$$;