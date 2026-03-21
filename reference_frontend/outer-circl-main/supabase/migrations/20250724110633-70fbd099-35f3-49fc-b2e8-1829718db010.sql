-- Create trigger for post-event rating notifications if it doesn't exist
DO $$
BEGIN
  -- Check if trigger exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'send_post_event_rating_notifications_trigger'
    AND event_object_table = 'events'
  ) THEN
    CREATE TRIGGER send_post_event_rating_notifications_trigger
      AFTER UPDATE ON public.events
      FOR EACH ROW
      EXECUTE FUNCTION public.send_post_event_rating_notifications();
  END IF;
END $$;

-- Manually send notifications for completed events that haven't had ratings yet
-- (for events with multiple participants only)
DO $$
DECLARE
  event_record RECORD;
  participant_record RECORD;
  participant_count INTEGER;
  event_title TEXT;
BEGIN
  -- Find completed events with multiple participants that don't have rating notifications
  FOR event_record IN
    SELECT DISTINCT e.id, e.title, e.date
    FROM events e
    JOIN event_participants ep ON e.id = ep.event_id AND ep.status = 'attending'
    WHERE e.status = 'completed'
    AND e.date > CURRENT_DATE - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.notification_type = 'rating_request' 
      AND (n.metadata->>'event_id')::uuid = e.id
    )
    GROUP BY e.id, e.title, e.date
    HAVING COUNT(ep.user_id) > 1
  LOOP
    -- Get participant count
    SELECT COUNT(ep.user_id) INTO participant_count
    FROM event_participants ep
    WHERE ep.event_id = event_record.id 
    AND ep.status = 'attending';
    
    -- Only send notifications for events with multiple participants
    IF participant_count > 1 THEN
      event_title := event_record.title;
      
      -- Send notification to each participant
      FOR participant_record IN 
        SELECT ep.user_id, p.name
        FROM event_participants ep
        JOIN profiles p ON p.id = ep.user_id
        WHERE ep.event_id = event_record.id 
        AND ep.status = 'attending'
      LOOP
        INSERT INTO notifications (
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
            'event_id', event_record.id,
            'event_title', event_title,
            'action_required', true
          )
        );
      END LOOP;
      
      RAISE NOTICE 'Sent rating notifications for event: % with % participants', event_title, participant_count;
    END IF;
  END LOOP;
END $$;