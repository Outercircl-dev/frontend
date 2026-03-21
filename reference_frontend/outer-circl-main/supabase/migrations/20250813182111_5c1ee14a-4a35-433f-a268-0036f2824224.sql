-- CRITICAL SECURITY FIXES (Fixed Version)
-- Priority 1: Protect sensitive data and prevent email harvesting

-- 1. STRENGTHEN SENSITIVE DATA RLS POLICIES
-- Add backup policies for profiles_sensitive that don't rely on custom functions
DROP POLICY IF EXISTS "enhanced_sensitive_data_access" ON public.profiles_sensitive;

-- Create multiple layered policies for profiles_sensitive
CREATE POLICY "profiles_sensitive_owner_only" 
ON public.profiles_sensitive 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Add time-based access rate limiting
CREATE POLICY "profiles_sensitive_rate_limited" 
ON public.profiles_sensitive 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND NOT EXISTS (
    SELECT 1 FROM public.security_audit_enhanced 
    WHERE user_id = auth.uid() 
    AND action = 'sensitive_data_access'
    AND timestamp > now() - INTERVAL '1 minute'
    GROUP BY user_id 
    HAVING COUNT(*) > 5
  )
);

-- 2. FIX EMAIL HARVESTING VULNERABILITY
-- Strengthen invitations table RLS policies
DROP POLICY IF EXISTS "own_email_invitation_access" ON public.invitations;
DROP POLICY IF EXISTS "subscription_admin_limited_access" ON public.invitations;

-- Create secure invitation policies with proper email validation
CREATE POLICY "invitations_own_email_only" 
ON public.invitations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.email() IS NOT NULL
  AND email = auth.email()
  AND status = 'pending'
  AND expires_at > now()
);

CREATE POLICY "invitations_admin_secure" 
ON public.invitations 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms 
    WHERE ms.id = invitations.subscription_id 
    AND ms.admin_user_id = auth.uid()
  )
);

-- Add rate limiting for invitation creation
CREATE POLICY "invitations_rate_limited" 
ON public.invitations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = invited_by
  AND NOT EXISTS (
    SELECT 1 FROM public.invitations 
    WHERE invited_by = auth.uid() 
    AND created_at > now() - INTERVAL '1 hour'
    GROUP BY invited_by 
    HAVING COUNT(*) > 10
  )
);

-- 3. SECURE PAYMENT DATA ACCESS
-- Add additional protection to payment_metadata
CREATE POLICY "payment_metadata_owner_verified" 
ON public.payment_metadata 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND security_level = 'high'
  AND last_accessed < now() + INTERVAL '24 hours'
);

-- 4. FIX FUNCTION SECURITY ISSUES
-- Update functions to have proper search paths and remove unnecessary SECURITY DEFINER
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
SET search_path TO 'public'
AS $$
BEGIN
  -- Security check: only allow users to access their own conversations
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot access other users conversations';
  END IF;

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

-- Remove the old insecure function validation
DROP FUNCTION IF EXISTS public.validate_sensitive_access(text, text);

-- 5. ADD SECURITY MONITORING
-- Create secure audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_details text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    risk_score,
    metadata,
    timestamp
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    CASE 
      WHEN p_action LIKE '%sensitive%' THEN 8
      WHEN p_action LIKE '%payment%' THEN 9
      WHEN NOT p_success THEN 7
      ELSE 3
    END,
    jsonb_build_object(
      'success', p_success,
      'details', p_details,
      'ip_address', inet_client_addr(),
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
    ),
    now()
  );
END;
$$;

-- Grant secure permissions
GRANT EXECUTE ON FUNCTION public.get_user_conversations_secure(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event_secure(text, text, uuid, boolean, text) TO authenticated;

-- 6. ENABLE ADDITIONAL SECURITY CONSTRAINTS
-- Add check constraints for critical tables
ALTER TABLE public.profiles_sensitive 
ADD CONSTRAINT check_last_security_check_recent 
CHECK (last_security_check > now() - INTERVAL '30 days');

ALTER TABLE public.invitations 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add regular indexes (not concurrent within transaction)
CREATE INDEX IF NOT EXISTS idx_security_audit_user_action_time 
ON public.security_audit_enhanced(user_id, action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_email_status 
ON public.invitations(email, status) WHERE status = 'pending';

-- Status check
SELECT 'CRITICAL SECURITY FIXES COMPLETED SUCCESSFULLY' as status;