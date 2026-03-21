-- Step 1: Remove duplicate triggers and audit for ambiguous column references

-- Drop any duplicate triggers first
DROP TRIGGER IF EXISTS send_post_event_rating_notifications_trigger ON public.events;

-- Check for any other functions that might have ambiguous column references
-- Let's recreate the main trigger functions with explicit table aliases

-- Fix notify_event_invitation function
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
$function$;

-- Fix send_immediate_event_notifications function  
CREATE OR REPLACE FUNCTION public.send_immediate_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_datetime TIMESTAMP WITH TIME ZONE;
  hours_until_event NUMERIC;
BEGIN
  -- Only process when event status changes to 'active' or 'confirmed'
  IF (OLD.status IS NULL OR OLD.status != 'active') AND NEW.status = 'active' THEN
    -- Calculate event datetime
    IF NEW.date IS NOT NULL THEN
      event_datetime := NEW.date;
      
      IF NEW.time IS NOT NULL THEN
        event_datetime := NEW.date + NEW.time;
      ELSE
        event_datetime := NEW.date + TIME '12:00:00'; -- Default to noon if no time specified
      END IF;
      
      -- Calculate hours until event
      hours_until_event := EXTRACT(EPOCH FROM (event_datetime - NOW())) / 3600;
      
      -- If event is within 24 hours and in the future, send immediate notifications
      IF hours_until_event > 0 AND hours_until_event <= 24 THEN
        -- Log the action for debugging
        RAISE NOTICE 'Sending immediate notifications for event: % (hours until: %)', NEW.title, hours_until_event;
        
        -- Call the edge function to send immediate notifications
        PERFORM net.http_post(
          url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-immediate-notifications',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
          body := json_build_object('eventId', NEW.id)::jsonb
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure all existing triggers are properly configured with no duplicates
-- Clean up and recreate the main triggers
DROP TRIGGER IF EXISTS trigger_notify_event_invitation ON public.event_invitations;
CREATE TRIGGER trigger_notify_event_invitation
  AFTER INSERT ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.notify_event_invitation();

DROP TRIGGER IF EXISTS trigger_send_immediate_event_notifications ON public.events;
CREATE TRIGGER trigger_send_immediate_event_notifications
  AFTER UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.send_immediate_event_notifications();

DROP TRIGGER IF EXISTS trigger_send_post_event_rating_notifications ON public.events;
CREATE TRIGGER trigger_send_post_event_rating_notifications
  AFTER UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.send_post_event_rating_notifications();