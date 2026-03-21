-- Fix ambiguous column reference in triggers and policies

-- First, let's check and fix the add_host_as_participant trigger
-- This trigger fires when an event is created and adds the host as a participant
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insert the host as an attending participant
  -- Use explicit table references to avoid ambiguity
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'attending');
  
  RETURN NEW;
END;
$function$;

-- Also fix the notify_event_invitation trigger to ensure no ambiguity
CREATE OR REPLACE FUNCTION public.notify_event_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  inviter_name TEXT;
  event_title TEXT;
BEGIN
  -- Only process new invitations
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Get inviter name with explicit table reference
    SELECT p.name INTO inviter_name
    FROM public.profiles p
    WHERE p.id = NEW.inviter_id;
    
    -- Get event title with explicit table reference
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

-- Fix any potential ambiguity in the send_immediate_event_notifications function
CREATE OR REPLACE FUNCTION public.send_immediate_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Also check and fix any ambiguity in RLS policy helper functions
-- Make sure is_event_host and is_event_participant functions use explicit references
CREATE OR REPLACE FUNCTION public.is_event_host(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id 
    AND e.host_id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_event_participant(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = p_event_id 
    AND ep.user_id = p_user_id 
    AND ep.status = 'attending'
  );
END;
$function$;