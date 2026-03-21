-- Update friend request notification function to include metadata
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
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      NEW.friend_id,
      'New Friend Request',
      COALESCE(requester_name, 'Someone') || ' sent you a friend request',
      'friend_request',
      jsonb_build_object(
        'sender_id', NEW.requested_by,
        'friendship_id', NEW.id
      )
    );
  ELSE
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      NEW.user_id,
      'New Friend Request', 
      COALESCE(requester_name, 'Someone') || ' sent you a friend request',
      'friend_request',
      jsonb_build_object(
        'sender_id', NEW.requested_by,
        'friendship_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update friend request acceptance notification function to include metadata
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
  INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
  VALUES (
    NEW.requested_by,
    'Friend Request Accepted',
    COALESCE(accepter_name, 'Someone') || ' accepted your friend request',
    'friend_request',
    jsonb_build_object(
      'sender_id', CASE 
        WHEN NEW.requested_by = NEW.user_id THEN NEW.friend_id
        ELSE NEW.user_id
      END,
      'friendship_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

-- Update event participant notification function to include metadata
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
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      event_record.host_id,
      'New Participant Joined Your Event',
      COALESCE(new_participant_name, 'Someone') || ' joined your event "' || event_record.title || '"',
      'event',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'participant_id', NEW.user_id
      )
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
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      participant_record.user_id,
      'New Participant Joined Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '"',
      'event',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'participant_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update saved event notification function to include metadata
CREATE OR REPLACE FUNCTION public.notify_saved_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_record RECORD;
  saved_user_record RECORD;
  new_participant_name TEXT;
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status != 'attending' THEN
    RETURN NEW;
  END IF;

  -- Get event details
  SELECT title INTO event_record
  FROM public.events 
  WHERE id = NEW.event_id;

  -- Get new participant name
  SELECT name INTO new_participant_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify all users who have saved this event (excluding the new participant)
  FOR saved_user_record IN 
    SELECT DISTINCT se.user_id
    FROM public.saved_events se
    WHERE se.event_id = NEW.event_id 
    AND se.user_id != NEW.user_id -- Exclude the new participant
  LOOP
    INSERT INTO public.notifications (user_id, title, content, notification_type, metadata)
    VALUES (
      saved_user_record.user_id,
      'New Participant in Saved Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '" that you saved',
      'event',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'participant_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;