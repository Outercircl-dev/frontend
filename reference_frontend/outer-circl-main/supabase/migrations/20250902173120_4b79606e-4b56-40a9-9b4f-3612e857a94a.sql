-- Fix ambiguous column reference in notify_event_invitation trigger function
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
    JOIN public.events e ON e.id = NEW.event_id
    WHERE p.id = NEW.inviter_id;
    
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
$function$