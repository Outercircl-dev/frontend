-- Create function to send post-event rating notifications
CREATE OR REPLACE FUNCTION public.send_post_event_rating_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record RECORD;
  other_participant_record RECORD;
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
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for post-event rating notifications
DROP TRIGGER IF EXISTS send_post_event_rating_notifications ON public.events;
CREATE TRIGGER send_post_event_rating_notifications
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_post_event_rating_notifications();

-- Create function to check if user has completed ratings for an event
CREATE OR REPLACE FUNCTION public.has_completed_event_ratings(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  total_participants INTEGER;
  completed_ratings INTEGER;
BEGIN
  -- Count total participants (excluding the user themselves)
  SELECT COUNT(*) INTO total_participants
  FROM public.event_participants
  WHERE event_id = p_event_id 
  AND user_id != p_user_id
  AND status = 'attending';
  
  -- Count how many ratings the user has submitted for this event
  SELECT COUNT(*) INTO completed_ratings
  FROM public.user_ratings
  WHERE event_id = p_event_id 
  AND rating_user_id = p_user_id;
  
  -- Return true if user has rated all other participants
  RETURN completed_ratings >= total_participants;
END;
$$;