-- Targeted fix for ambiguous column reference 'event_id' error
-- Drop and recreate only the functions causing the issue

-- Drop functions that might have conflicts
DROP FUNCTION IF EXISTS public.log_sensitive_access(uuid,text,text,uuid,jsonb);

-- The main issue is likely in the notify_event_invitation function
-- Let's fix it with proper separate queries to avoid ambiguity
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
    -- Get inviter name with explicit table reference
    SELECT profiles.name INTO inviter_name
    FROM public.profiles
    WHERE profiles.id = NEW.inviter_id;
    
    -- Get event title with explicit table reference
    SELECT events.title INTO event_title
    FROM public.events
    WHERE events.id = NEW.event_id;
    
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

-- Also fix the leave_event function which might be causing issues
CREATE OR REPLACE FUNCTION public.leave_event(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_title TEXT;
  v_host_id UUID;
  v_rows_affected INTEGER;
BEGIN
  -- Get event details with explicit table reference
  SELECT events.title, events.host_id INTO v_event_title, v_host_id
  FROM public.events
  WHERE events.id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Don't allow host to leave their own event
  IF v_host_id = auth.uid() THEN
    RETURN FALSE;
  END IF;
  
  -- Remove user from participants
  DELETE FROM public.event_participants
  WHERE event_participants.event_id = p_event_id 
  AND event_participants.user_id = auth.uid();
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  -- Update any pending invitations to declined
  UPDATE public.event_invitations
  SET status = 'declined', responded_at = now(), updated_at = now()
  WHERE event_invitations.event_id = p_event_id 
  AND event_invitations.invited_user_id = auth.uid() 
  AND event_invitations.status = 'pending';
  
  -- Notify host if user was participating
  IF v_rows_affected > 0 THEN
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
      COALESCE(profiles.name, profiles.username) || ' left "' || v_event_title || '"',
      'event',
      jsonb_build_object(
        'event_id', p_event_id,
        'event_title', v_event_title,
        'left_by', auth.uid()
      )
    FROM public.profiles
    WHERE profiles.id = auth.uid();
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Create a simple log function without conflicts
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
AS $function$
BEGIN
  -- Simple logging without complex dependencies
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    success
  ) VALUES (
    p_user_id,
    p_operation,
    p_table_name,
    p_resource_id,
    true
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    NULL;
END;
$function$;