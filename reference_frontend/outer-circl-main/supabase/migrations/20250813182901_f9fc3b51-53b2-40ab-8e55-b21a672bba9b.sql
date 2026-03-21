-- Final critical security fixes - Simplified approach

-- 1. Fix profiles_sensitive table RLS policies (CRITICAL)
DROP POLICY IF EXISTS "profiles_sensitive_strict_owner" ON public.profiles_sensitive;
CREATE POLICY "profiles_sensitive_strict_owner" ON public.profiles_sensitive
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Add additional security check to prevent bypass
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
);

-- 2. Drop and recreate problematic security definer views with security invoker
DROP VIEW IF EXISTS public.profiles_public_secure CASCADE;
CREATE VIEW public.profiles_public_secure 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.reliability_rating,
  p.created_at,
  p.updated_at,
  p.name,
  p.username,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.location,
  p.occupation,
  p.education_level,
  p.gender,
  p.interests,
  p.languages,
  p.membership_tier
FROM profiles p
WHERE 
  -- Only show profiles where user has permission to view
  auth.uid() IS NOT NULL AND (
    -- User's own profile
    auth.uid() = p.id OR
    -- Public profiles
    EXISTS (
      SELECT 1 FROM profile_privacy_settings pps 
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    ) OR
    -- Friend's profiles when visibility is 'followers'
    (
      EXISTS (
        SELECT 1 FROM profile_privacy_settings pps 
        WHERE pps.user_id = p.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      EXISTS (
        SELECT 1 FROM friendships f 
        WHERE ((f.user_id = p.id AND f.friend_id = auth.uid()) OR 
               (f.user_id = auth.uid() AND f.friend_id = p.id)) 
        AND f.status = 'accepted'
      )
    )
  );

-- 3. Drop and recreate user_activity_summary_secure view with security invoker
DROP VIEW IF EXISTS public.user_activity_summary_secure CASCADE;
CREATE VIEW public.user_activity_summary_secure 
WITH (security_invoker = true) AS
SELECT 
  p.id as user_id,
  COALESCE(COUNT(uah.id), 0) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  jsonb_object_agg(
    COALESCE(uah.category, 'unknown'), 
    COALESCE(uah.activity_count, 0)
  ) FILTER (WHERE uah.category IS NOT NULL) as activities_by_category,
  MAX(uah.updated_at) as updated_at,
  p.name as user_name
FROM profiles p
LEFT JOIN user_activity_history uah ON p.id = uah.user_id
WHERE auth.uid() = p.id  -- Users can only see their own activity summary
GROUP BY p.id, p.name;

-- 4. Create audit trigger function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to sensitive data using the existing function
  PERFORM public.log_security_event_secure(
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'timestamp', now(),
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Apply audit triggers only to confirmed tables
DO $$
BEGIN
  -- Only apply to profiles_sensitive if it's a real table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_sensitive'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP TRIGGER IF EXISTS audit_profiles_sensitive_access ON public.profiles_sensitive;
    EXECUTE 'CREATE TRIGGER audit_profiles_sensitive_access
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles_sensitive
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access()';
  END IF;
  
  -- Apply to payment_metadata if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payment_metadata'
    AND table_type = 'BASE TABLE'
  ) THEN
    DROP TRIGGER IF EXISTS audit_payment_metadata_access ON public.payment_metadata;
    EXECUTE 'CREATE TRIGGER audit_payment_metadata_access
      AFTER INSERT OR UPDATE OR DELETE ON public.payment_metadata
      FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_access()';
  END IF;
END $$;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles_public_secure TO authenticated;
GRANT SELECT ON public.user_activity_summary_secure TO authenticated;

-- 7. Add critical security indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time 
ON public.security_audit_enhanced(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email_pending 
ON public.invitations(email) WHERE status = 'pending';

-- 8. Update the get_user_conversations_secure function with enhanced security
CREATE OR REPLACE FUNCTION public.get_user_conversations_secure(target_user_id uuid)
RETURNS TABLE (
  conversation_id text,
  conversation_type text,
  other_participant_id uuid,
  other_participant_name text,
  last_message_content text,
  last_message_time timestamp with time zone,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure only the user can access their own conversations
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only view your own conversations';
  END IF;

  -- Return empty result if user is not authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Log this access
  PERFORM public.log_security_event_secure(
    'get_conversations',
    'conversations',
    target_user_id,
    true,
    'User accessed their conversations'
  );

  RETURN QUERY
  SELECT DISTINCT
    CASE 
      WHEN m.message_type = 'direct' THEN 
        LEAST(m.sender_id::text, m.recipient_id::text) || '_' || GREATEST(m.sender_id::text, m.recipient_id::text)
      ELSE 
        'event_' || m.event_id::text 
    END as conversation_id,
    m.message_type as conversation_type,
    CASE 
      WHEN m.message_type = 'direct' THEN 
        CASE WHEN m.sender_id = target_user_id THEN m.recipient_id ELSE m.sender_id END
      ELSE NULL 
    END as other_participant_id,
    CASE 
      WHEN m.message_type = 'direct' THEN 
        (SELECT name FROM profiles WHERE id = CASE WHEN m.sender_id = target_user_id THEN m.recipient_id ELSE m.sender_id END)
      ELSE 
        (SELECT title FROM events WHERE id = m.event_id)
    END as other_participant_name,
    m.content as last_message_content,
    m.created_at as last_message_time,
    (
      SELECT COUNT(*)::bigint 
      FROM messages m2 
      WHERE 
        (
          (m.message_type = 'direct' AND m2.message_type = 'direct' AND 
           ((m2.sender_id = m.sender_id AND m2.recipient_id = m.recipient_id) OR 
            (m2.sender_id = m.recipient_id AND m2.recipient_id = m.sender_id)))
          OR 
          (m.message_type = 'event' AND m2.message_type = 'event' AND m2.event_id = m.event_id)
        )
        AND m2.recipient_id = target_user_id 
        AND m2.read_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_deleted_messages udm 
          WHERE udm.user_id = target_user_id AND udm.message_id = m2.id
        )
    ) as unread_count
  FROM messages m
  WHERE 
    (m.sender_id = target_user_id OR m.recipient_id = target_user_id OR 
     (m.message_type = 'event' AND EXISTS (
       SELECT 1 FROM event_participants ep 
       WHERE ep.event_id = m.event_id AND ep.user_id = target_user_id
     )))
    AND NOT EXISTS (
      SELECT 1 FROM user_deleted_conversations udc 
      WHERE udc.user_id = target_user_id 
      AND (
        (m.message_type = 'direct' AND udc.conversation_id = 
         LEAST(m.sender_id::text, m.recipient_id::text) || '_' || GREATEST(m.sender_id::text, m.recipient_id::text)) OR
        (m.message_type = 'event' AND udc.conversation_id = 'event_' || m.event_id::text)
      )
    )
  ORDER BY last_message_time DESC;
END;
$$;

-- Status check
SELECT 'CRITICAL SECURITY FIXES APPLIED SUCCESSFULLY' as status;