-- Fix remaining Function Search Path Mutable warnings - Handle parameter conflicts

-- Drop existing functions that need parameter changes
DROP FUNCTION IF EXISTS public.log_security_event_secure(text, text, uuid, boolean, text);
DROP FUNCTION IF EXISTS public.sanitize_html_input(text);
DROP FUNCTION IF EXISTS public.log_sensitive_access_simple(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.check_sensitive_data_permission_enhanced(uuid, text);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Basic HTML/XSS sanitization
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous HTML tags and scripts
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi'),
        '<iframe[^>]*>.*?</iframe>', '', 'gi'
      ),
      '<object[^>]*>.*?</object>', '', 'gi'
    ),
    'javascript:', '', 'gi'
  );
END;
$$;

-- Recreate log_security_event_secure function
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_success boolean,
  p_metadata text DEFAULT '{}'::text
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
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    COALESCE(p_metadata::jsonb, '{}'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to avoid disrupting normal operations
    NULL;
END;
$$;

-- Recreate log_sensitive_access_simple function
CREATE OR REPLACE FUNCTION public.log_sensitive_access_simple(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log sensitive data access for security monitoring
  INSERT INTO public.security_audit_enhanced (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_user_id,
    p_operation,
    p_table_name,
    p_resource_id,
    jsonb_build_object(
      'timestamp', now(),
      'audit_type', 'sensitive_access'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to avoid disrupting operations
    NULL;
END;
$$;

-- Recreate check_sensitive_data_permission_enhanced function
CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission_enhanced(
  p_user_id uuid,
  p_table_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  jwt_claims jsonb;
  jwt_aud text;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Must be authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Must be accessing own data
  IF current_user_id != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Additional JWT validation for enhanced security
  jwt_claims := auth.jwt();
  jwt_aud := jwt_claims->>'aud';
  
  -- Validate JWT audience
  IF jwt_aud IS NULL OR jwt_aud != 'authenticated' THEN
    RETURN false;
  END IF;
  
  -- Log the access attempt
  PERFORM log_sensitive_access_simple(
    current_user_id,
    'sensitive_data_access',
    p_table_name,
    p_user_id
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Deny access on any error
    RETURN false;
END;
$$;

-- Update helper functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = subscription_id AND ms.admin_user_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = subscription_id AND ms.user_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_host(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.host_id = user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = event_id AND ep.user_id = user_id AND ep.status = 'attending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN COALESCE((
    SELECT email_notifications
    FROM public.profile_privacy_settings
    WHERE user_id = wants_email_notifications.user_id
  ), true);
END;
$$;