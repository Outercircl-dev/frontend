-- Fix function conflicts and ambiguous column references
-- Drop existing functions that have parameter conflicts

DROP FUNCTION IF EXISTS public.log_security_event_secure(text,text,uuid,boolean,text);

-- Recreate the log_security_event_secure function with correct parameters
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

-- Fix the notify_event_invitation function with proper JOIN instead of CROSS JOIN
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
    -- Get inviter name
    SELECT p.name INTO inviter_name
    FROM public.profiles p
    WHERE p.id = NEW.inviter_id;
    
    -- Get event title  
    SELECT e.title INTO event_title
    FROM public.events e
    WHERE e.id = NEW.event_id;
    
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
      COALESCE(inviter_name, 'Someone') || ' invited you to "' || COALESCE(event_title, 'an activity') || '"',
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

-- Fix accept_event_invitation function with separate queries
CREATE OR REPLACE FUNCTION public.accept_event_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  v_event_title TEXT;
  v_user_name TEXT;
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
  
  -- Get event title for notification
  SELECT e.title INTO v_event_title
  FROM public.events e
  WHERE e.id = invitation_record.event_id;
  
  -- Get user name for notification
  SELECT COALESCE(p.name, p.username) INTO v_user_name
  FROM public.profiles p 
  WHERE p.id = invitation_record.invited_user_id;
  
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
    COALESCE(v_user_name, 'Someone') || ' accepted your invitation to "' || COALESCE(v_event_title, 'an activity') || '"',
    'event',
    jsonb_build_object(
      'event_id', invitation_record.event_id,
      'event_title', v_event_title,
      'accepted_by', invitation_record.invited_user_id
    )
  FROM public.events e
  WHERE e.id = invitation_record.event_id;
  
  RETURN TRUE;
END;
$function$;

-- Create missing helper functions with proper signatures
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

-- Create missing wants_email_notifications function
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

-- Create missing permission functions
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

-- Create log_sensitive_access function
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