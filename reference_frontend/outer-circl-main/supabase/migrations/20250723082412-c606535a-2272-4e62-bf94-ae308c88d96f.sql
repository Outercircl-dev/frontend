-- Create function to notify about activity status changes
CREATE OR REPLACE FUNCTION public.notify_activity_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  participant_record RECORD;
  status_message TEXT;
  event_title TEXT;
BEGIN
  -- Only notify when status changes to 'cancelled' or 'completed'
  IF OLD.status != NEW.status AND NEW.status IN ('cancelled', 'completed') THEN
    -- Get event title
    SELECT title INTO event_title FROM public.events WHERE id = NEW.id;
    
    -- Set appropriate message based on status
    IF NEW.status = 'cancelled' THEN
      status_message := 'The activity "' || event_title || '" has been cancelled';
    ELSIF NEW.status = 'completed' THEN
      status_message := 'The activity "' || event_title || '" has been completed';
    END IF;
    
    -- Notify all participants (excluding the host if they made the change)
    FOR participant_record IN 
      SELECT ep.user_id
      FROM public.event_participants ep
      WHERE ep.event_id = NEW.id 
      AND ep.status = 'attending'
    LOOP
      INSERT INTO public.notifications (
        user_id, 
        title, 
        content, 
        notification_type,
        metadata
      )
      VALUES (
        participant_record.user_id,
        'Activity Status Changed',
        status_message,
        'event',
        jsonb_build_object(
          'event_id', NEW.id,
          'event_title', event_title,
          'status_change', NEW.status,
          'action_required', false
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for activity status changes
DROP TRIGGER IF EXISTS notify_activity_status_change ON public.events;
CREATE TRIGGER notify_activity_status_change
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_activity_status_change();