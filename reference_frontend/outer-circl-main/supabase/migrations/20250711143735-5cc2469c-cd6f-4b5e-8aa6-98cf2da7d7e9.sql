-- Update the existing post-event trigger to also send direct messages
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
    -- Get event title
    SELECT title INTO event_title FROM public.events WHERE id = NEW.id;
    
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
        'Rate Event Participants',
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
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('eventId', NEW.id)::jsonb
    );
  END IF;

  RETURN NEW;
END;
$function$;