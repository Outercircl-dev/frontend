-- Fix ambiguous column references in trigger functions
-- This addresses the persistent "column reference 'event_id' is ambiguous" error

-- First, fix the notify_event_invitation function with explicit table aliases
CREATE OR REPLACE FUNCTION public.notify_event_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inviter_name TEXT;
  event_title TEXT;
BEGIN
  -- Only process new invitations
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get inviter name and event title with explicit table aliases
    SELECT 
      p.name,
      e.title
    INTO inviter_name, event_title
    FROM public.profiles p
    CROSS JOIN public.events e 
    WHERE p.id = NEW.inviter_id
    AND e.id = NEW.event_id;
    
    -- Send notification to invited user
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      notification_type,
      metadata
    )
    VALUES (
      NEW.invited_user_id,
      'Activity Invitation',
      COALESCE(inviter_name, 'Someone') || ' invited you to "' || event_title || '"',
      'event',
      jsonb_build_object(
        'invitation_id', NEW.id,
        'event_id', NEW.event_id,
        'event_title', event_title,
        'inviter_id', NEW.inviter_id,
        'action_required', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix leave_event function with proper variable naming
CREATE OR REPLACE FUNCTION public.leave_event(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_title TEXT;
  v_host_id UUID;
BEGIN
  -- Get event details with explicit variable names
  SELECT e.title, e.host_id INTO v_event_title, v_host_id
  FROM public.events e
  WHERE e.id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Don't allow host to leave their own event
  IF v_host_id = auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Remove user from participants
  DELETE FROM public.event_participants ep
  WHERE ep.event_id = p_event_id AND ep.user_id = auth.uid();
  
  -- Update any pending invitations to declined
  UPDATE public.event_invitations ei
  SET status = 'declined', responded_at = now(), updated_at = now()
  WHERE ei.event_id = p_event_id 
  AND ei.invited_user_id = auth.uid() 
  AND ei.status = 'pending';
  
  -- Notify host if user was participating
  IF FOUND THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      content,
      notification_type,
      metadata
    )
    SELECT 
      v_host_id,
      'User Left Activity',
      COALESCE(p.name, p.username) || ' left "' || v_event_title || '"',
      'event',
      jsonb_build_object(
        'event_id', p_event_id,
        'event_title', v_event_title,
        'left_by', auth.uid()
      )
    FROM public.profiles p
    WHERE p.id = auth.uid();
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Fix accept_event_invitation function with explicit aliases
CREATE OR REPLACE FUNCTION public.accept_event_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT ei.* INTO invitation_record
  FROM public.event_invitations ei
  WHERE ei.id = p_invitation_id
  AND ei.invited_user_id = auth.uid()
  AND ei.status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update invitation status
  UPDATE public.event_invitations ei
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE ei.id = p_invitation_id;
  
  -- Add user as participant
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (invitation_record.event_id, invitation_record.invited_user_id, 'attending')
  ON CONFLICT (event_id, user_id) 
  DO UPDATE SET status = 'attending', updated_at = now();
  
  -- Send notification to event host
  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    notification_type,
    metadata
  )
  SELECT 
    e.host_id,
    'Invitation Accepted',
    COALESCE(p.name, p.username) || ' accepted your invitation to "' || e.title || '"',
    'event',
    jsonb_build_object(
      'event_id', e.id,
      'event_title', e.title,
      'accepted_by', invitation_record.invited_user_id
    )
  FROM public.events e
  CROSS JOIN public.profiles p 
  WHERE e.id = invitation_record.event_id
  AND p.id = invitation_record.invited_user_id;
  
  RETURN TRUE;
END;
$function$;

-- Create missing functions that might be referenced
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Remove HTML tags and return sanitized text
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove HTML/XML tags
  RETURN REGEXP_REPLACE(input_text, '<[^>]*>', '', 'g');
END;
$function$;

-- Create missing helper functions
CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT pps.email_notifications 
     FROM public.profile_privacy_settings pps 
     WHERE pps.user_id = wants_email_notifications.user_id),
    true -- Default to true if no settings found
  );
END;
$function$;

-- Create missing security functions
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_success boolean,
  p_metadata text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    success,
    error_message,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_success,
    p_metadata,
    NULL, -- IP address not available in function context
    NULL  -- User agent not available in function context
  );
END;
$function$;

-- Create missing permission check functions
CREATE OR REPLACE FUNCTION public.check_sensitive_data_permission_enhanced(
  p_user_id uuid,
  p_table_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow access to own data
  RETURN (auth.uid() IS NOT NULL AND auth.uid() = p_user_id);
END;
$function$;

-- Create missing log function for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_user_id uuid,
  p_operation text,
  p_table_name text,
  p_resource_id uuid,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.log_security_event_secure(
    p_operation,
    p_table_name,
    p_resource_id,
    true,
    p_metadata::text
  );
END;
$function$;

-- Create missing user_can_view_event function
CREATE OR REPLACE FUNCTION public.user_can_view_event(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow if user is the host
  IF EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = p_event_id AND e.host_id = p_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Allow if user is a participant
  IF EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  ) THEN
    RETURN true;
  END IF;
  
  -- Allow if event is public and active
  IF EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = p_event_id 
    AND e.status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Create missing is_friends_with function
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE ((f.user_id = user1_id AND f.friend_id = user2_id) OR
           (f.user_id = user2_id AND f.friend_id = user1_id))
    AND f.status = 'accepted'
  );
END;
$function$;

-- Create missing membership validation functions
CREATE OR REPLACE FUNCTION public.is_subscription_admin(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_subscriptions ms
    WHERE ms.id = p_subscription_id 
    AND ms.admin_user_id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_subscription_member(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membership_slots ms
    WHERE ms.subscription_id = p_subscription_id 
    AND ms.user_id = p_user_id
  );
END;
$function$;

-- Create missing invitation validation function
CREATE OR REPLACE FUNCTION public.validate_invitation_admin_access(p_subscription_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.is_subscription_admin(p_subscription_id, p_user_id);
END;
$function$;