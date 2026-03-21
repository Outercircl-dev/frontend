-- Fix remaining ambiguous column reference in send_post_event_rating_notifications function

CREATE OR REPLACE FUNCTION public.send_post_event_rating_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  participant_record RECORD;
  event_title TEXT;
BEGIN
  -- Only process when event status changes to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get event title with explicit table alias to avoid ambiguity
    SELECT events.title INTO event_title 
    FROM public.events events 
    WHERE events.id = NEW.id;
    
    -- Get all participants who attended the event
    FOR participant_record IN 
      SELECT ep.user_id, p.name
      FROM public.event_participants ep
      JOIN public.profiles p ON p.id = ep.user_id
      WHERE ep.event_id = NEW.id 
      AND ep.status = 'attending'
    LOOP
      -- Send notification to each participant to rate others
      INSERT INTO public.notifications (
        user_id, 
        title, 
        content, 
        notification_type,
        metadata
      )
      VALUES (
        participant_record.user_id,
        'Rate Activity Participants',
        'Please rate your fellow participants from "' || event_title || '" to help improve our community',
        'rating_request',
        jsonb_build_object(
          'event_id', NEW.id,
          'event_title', event_title,
          'action_required', true
        )
      );
    END LOOP;
    
    -- Also trigger the edge function to send direct messages
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-post-event-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE'
      ),
      body := jsonb_build_object('eventId', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;