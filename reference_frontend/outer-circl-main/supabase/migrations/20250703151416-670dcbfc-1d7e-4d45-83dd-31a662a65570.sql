-- Create function to notify event participants about new attendees
CREATE OR REPLACE FUNCTION public.notify_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_record RECORD;
  participant_record RECORD;
  new_participant_name TEXT;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  -- Get event details
  SELECT title, host_id INTO event_record
  FROM public.events 
  WHERE id = NEW.event_id;

  -- Get new participant name
  SELECT name INTO new_participant_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify the event host (if different from the new participant)
  IF event_record.host_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, content, notification_type)
    VALUES (
      event_record.host_id,
      'New Participant Joined Your Event',
      COALESCE(new_participant_name, 'Someone') || ' joined your event "' || event_record.title || '"',
      'event'
    );
  END IF;

  -- Notify all other participants (excluding the new participant and host)
  FOR participant_record IN 
    SELECT DISTINCT ep.user_id
    FROM public.event_participants ep
    WHERE ep.event_id = NEW.event_id 
    AND ep.status = 'attending'
    AND ep.user_id != NEW.user_id -- Exclude the new participant
    AND ep.user_id != event_record.host_id -- Exclude host (already notified above)
  LOOP
    INSERT INTO public.notifications (user_id, title, content, notification_type)
    VALUES (
      participant_record.user_id,
      'New Participant Joined Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '"',
      'event'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new event participants
DROP TRIGGER IF EXISTS notify_new_event_participant ON public.event_participants;
CREATE TRIGGER notify_new_event_participant
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_participants();

-- Create function to notify about friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Only process pending friend requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get requester name
  SELECT name INTO requester_name
  FROM public.profiles
  WHERE id = NEW.requested_by;

  -- Notify the person who received the friend request
  -- The friend_id is the person receiving the request when requested_by = user_id
  IF NEW.requested_by = NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, content, notification_type)
    VALUES (
      NEW.friend_id,
      'New Friend Request',
      COALESCE(requester_name, 'Someone') || ' sent you a friend request',
      'friend_request'
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, content, notification_type)
    VALUES (
      NEW.user_id,
      'New Friend Request', 
      COALESCE(requester_name, 'Someone') || ' sent you a friend request',
      'friend_request'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS notify_new_friend_request ON public.friendships;
CREATE TRIGGER notify_new_friend_request
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- Create function to notify about accepted friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Only process when status changes from pending to accepted
  IF OLD.status != 'pending' OR NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Get the name of person who accepted the request
  SELECT name INTO accepter_name
  FROM public.profiles
  WHERE id = CASE 
    WHEN NEW.requested_by = NEW.user_id THEN NEW.friend_id
    ELSE NEW.user_id
  END;

  -- Notify the person who originally sent the request
  INSERT INTO public.notifications (user_id, title, content, notification_type)
  VALUES (
    NEW.requested_by,
    'Friend Request Accepted',
    COALESCE(accepter_name, 'Someone') || ' accepted your friend request',
    'friend_request'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for accepted friend requests
DROP TRIGGER IF EXISTS notify_friend_request_accepted ON public.friendships;
CREATE TRIGGER notify_friend_request_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request_accepted();