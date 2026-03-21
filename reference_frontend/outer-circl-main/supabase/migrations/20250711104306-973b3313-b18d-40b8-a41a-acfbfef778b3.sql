-- Fix security vulnerabilities by adding SET search_path = 'public' to all functions

-- Function: add_host_as_participant
CREATE OR REPLACE FUNCTION public.add_host_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert the host as an attending participant
  INSERT INTO public.event_participants (event_id, user_id, status)
  VALUES (NEW.id, NEW.host_id, 'attending');
  
  RETURN NEW;
END;
$$;

-- Function: allows_ad_personalization
CREATE OR REPLACE FUNCTION public.allows_ad_personalization(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(ad_personalization, true)
  FROM public.profile_privacy_settings
  WHERE user_id = allows_ad_personalization.user_id;
$$;

-- Function: auto_complete_past_events
CREATE OR REPLACE FUNCTION public.auto_complete_past_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  completed_count INTEGER := 0;
  event_record RECORD;
BEGIN
  -- Find events that should be marked as completed
  -- Events are considered past if their date + time is before now
  FOR event_record IN
    SELECT id, title, date, time, status
    FROM public.events
    WHERE status = 'active'
    AND date IS NOT NULL
    AND (
      -- Events with both date and time
      (time IS NOT NULL AND (date + time) < NOW()) OR
      -- Events with only date (consider completed if date has passed)
      (time IS NULL AND date < CURRENT_DATE)
    )
  LOOP
    -- Mark the event as completed
    UPDATE public.events
    SET status = 'completed', updated_at = NOW()
    WHERE id = event_record.id;
    
    completed_count := completed_count + 1;
    
    -- Log the completion for debugging
    RAISE NOTICE 'Auto-completed event: % (ID: %)', event_record.title, event_record.id;
  END LOOP;
  
  RETURN completed_count;
END;
$$;

-- Function: can_message_user
CREATE OR REPLACE FUNCTION public.can_message_user(sender_id uuid, recipient_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_privacy TEXT;
  are_friends BOOLEAN := false;
BEGIN
  -- Get recipient's message privacy setting
  SELECT message_privacy INTO recipient_privacy
  FROM public.profile_privacy_settings
  WHERE user_id = recipient_id;
  
  -- Default to 'everyone' if no setting exists
  IF recipient_privacy IS NULL THEN
    recipient_privacy := 'everyone';
  END IF;
  
  -- If privacy is set to 'everyone', allow messaging
  IF recipient_privacy = 'everyone' THEN
    RETURN true;
  END IF;
  
  -- If privacy is set to 'nobody', deny messaging
  IF recipient_privacy = 'nobody' THEN
    RETURN false;
  END IF;
  
  -- If privacy is set to 'followers', check if they are friends
  IF recipient_privacy = 'followers' THEN
    SELECT is_friends_with(sender_id, recipient_id) INTO are_friends;
    RETURN are_friends;
  END IF;
  
  RETURN false;
END;
$$;

-- Function: can_send_notification
CREATE OR REPLACE FUNCTION public.can_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check based on notification type
  CASE p_notification_type
    WHEN 'message' THEN
      -- Check if user wants push notifications
      RETURN wants_push_notifications(p_user_id);
    WHEN 'event' THEN
      -- Check if user wants event-related notifications
      RETURN wants_push_notifications(p_user_id) AND wants_event_messages(p_user_id);
    WHEN 'friend_request' THEN
      -- Check if user wants push notifications
      RETURN wants_push_notifications(p_user_id);
    ELSE
      -- For general notifications, check push notification setting
      RETURN wants_push_notifications(p_user_id);
  END CASE;
END;
$$;

-- Function: can_show_recommendations
CREATE OR REPLACE FUNCTION public.can_show_recommendations(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT get_personalization_level(p_user_id) = 'full';
$$;

-- Function: can_use_for_analytics
CREATE OR REPLACE FUNCTION public.can_use_for_analytics(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT get_personalization_level(p_user_id) != 'minimal';
$$;

-- Function: has_completed_event_ratings
CREATE OR REPLACE FUNCTION public.has_completed_event_ratings(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
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

-- Function: check_user_rating_status
CREATE OR REPLACE FUNCTION public.check_user_rating_status(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_ratings 
    WHERE event_id = p_event_id AND rating_user_id = p_user_id
  );
$$;

-- Function: check_username_available
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text, current_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = username_to_check 
    AND (current_user_id IS NULL OR id != current_user_id)
  );
$$;

-- Function: create_subscription_slots
CREATE OR REPLACE FUNCTION public.create_subscription_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  slot_count INTEGER;
  i INTEGER;
BEGIN
  -- Determine slot count based on subscription tier
  CASE NEW.subscription_tier
    WHEN 'duo' THEN slot_count := 2;
    WHEN 'family' THEN slot_count := 6;
    ELSE slot_count := 1;
  END CASE;

  -- Create slots (position 0 is for admin)
  FOR i IN 0..(slot_count - 1) LOOP
    INSERT INTO public.membership_slots (subscription_id, slot_position, user_id, status)
    VALUES (
      NEW.id, 
      i,
      CASE WHEN i = 0 THEN NEW.admin_user_id ELSE NULL END,
      CASE WHEN i = 0 THEN 'active' ELSE 'available' END
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function: get_personalization_level
CREATE OR REPLACE FUNCTION public.get_personalization_level(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(personalization_opt, 'full')
  FROM public.profile_privacy_settings
  WHERE user_id = get_personalization_level.user_id;
$$;

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function: insert_user_ratings
CREATE OR REPLACE FUNCTION public.insert_user_ratings(ratings_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rating_record jsonb;
BEGIN
  FOR rating_record IN SELECT * FROM jsonb_array_elements(ratings_data)
  LOOP
    INSERT INTO public.user_ratings (
      event_id,
      rated_user_id,
      rating_user_id,
      rating,
      created_at
    ) VALUES (
      (rating_record->>'event_id')::uuid,
      (rating_record->>'rated_user_id')::uuid,
      (rating_record->>'rating_user_id')::uuid,
      (rating_record->>'rating')::integer,
      (rating_record->>'created_at')::timestamp with time zone
    );
  END LOOP;
END;
$$;

-- Function: is_event_owner
CREATE OR REPLACE FUNCTION public.is_event_owner(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND host_id = user_id
  );
$$;

-- Function: is_event_participant
CREATE OR REPLACE FUNCTION public.is_event_participant(event_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants 
    WHERE event_participants.event_id = is_event_participant.event_id 
    AND event_participants.user_id = is_event_participant.user_id
    AND status = 'attending'
  );
$$;

-- Function: notify_event_participants
CREATE OR REPLACE FUNCTION public.notify_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Function: notify_friend_request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Function: notify_friend_request_accepted
CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Function: sanitize_event_inputs
CREATE OR REPLACE FUNCTION public.sanitize_event_inputs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.title := public.sanitize_html_input(NEW.title);
  NEW.description := public.sanitize_html_input(NEW.description);
  NEW.location := public.sanitize_html_input(NEW.location);
  
  RETURN NEW;
END;
$$;

-- Function: sanitize_profile_inputs
CREATE OR REPLACE FUNCTION public.sanitize_profile_inputs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.name := public.sanitize_html_input(NEW.name);
  NEW.bio := public.sanitize_html_input(NEW.bio);
  NEW.location := public.sanitize_html_input(NEW.location);
  NEW.occupation := public.sanitize_html_input(NEW.occupation);
  
  RETURN NEW;
END;
$$;

-- Function: send_post_event_rating_notifications
CREATE OR REPLACE FUNCTION public.send_post_event_rating_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Function: send_pre_event_reminders
CREATE OR REPLACE FUNCTION public.send_pre_event_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  reminder_count INTEGER := 0;
  event_record RECORD;
  participant_record RECORD;
  reminder_24h_content TEXT;
  reminder_12h_content TEXT;
  event_datetime TIMESTAMP WITH TIME ZONE;
  hours_until_event INTEGER;
BEGIN
  -- Find events that need reminders (24h or 12h before)
  FOR event_record IN
    SELECT id, title, date, time, location, description
    FROM public.events
    WHERE status = 'active'
    AND date IS NOT NULL
    AND date >= CURRENT_DATE
    AND date <= CURRENT_DATE + INTERVAL '2 days'
  LOOP
    -- Calculate event datetime
    IF event_record.time IS NOT NULL THEN
      event_datetime := event_record.date + event_record.time;
    ELSE
      event_datetime := event_record.date + TIME '12:00:00'; -- Default to noon for date-only events
    END IF;
    
    -- Calculate hours until event
    hours_until_event := EXTRACT(EPOCH FROM (event_datetime - NOW())) / 3600;
    
    -- Check if we need to send 24-hour reminder (between 23-25 hours before)
    IF hours_until_event BETWEEN 23 AND 25 THEN
      reminder_24h_content := 'Tomorrow''s the day! 🎉 Your activity "' || event_record.title || '" is happening in about 24 hours. 

📍 Location: ' || COALESCE(event_record.location, 'TBD') || '
⏰ Time: ' || COALESCE(event_record.time::text, 'See event details') || '

👕 What to wear: Dress comfortably and weather-appropriately. Check the forecast and dress in layers if needed!

💬 Get to know each other: Why not share a fun fact about yourself or what you''re excited about for tomorrow? It''s a great way to break the ice before meeting! Comment below to introduce yourself! 

See you tomorrow! 🌟';

      -- Send to all confirmed participants
      FOR participant_record IN
        SELECT ep.user_id, p.name
        FROM public.event_participants ep
        JOIN public.profiles p ON p.id = ep.user_id
        WHERE ep.event_id = event_record.id 
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
          '24h Reminder: ' || event_record.title,
          reminder_24h_content,
          'event_reminder',
          jsonb_build_object(
            'event_id', event_record.id,
            'event_title', event_record.title,
            'reminder_type', '24_hours',
            'action_required', false
          )
        );
        
        reminder_count := reminder_count + 1;
      END LOOP;
      
    -- Check if we need to send 12-hour reminder (between 11-13 hours before)
    ELSIF hours_until_event BETWEEN 11 AND 13 THEN
      reminder_12h_content := 'Final reminder! 🚨 Your activity "' || event_record.title || '" is happening in about 12 hours!

📍 Location: ' || COALESCE(event_record.location, 'TBD') || '
⏰ Time: ' || COALESCE(event_record.time::text, 'See event details') || '

✅ Last-minute checklist:
• Check the weather and dress accordingly
• Bring water and any personal items you might need
• Plan your route and arrive on time
• Bring your positive energy! 

👋 If you haven''t already, introduce yourself to your fellow participants! Share what you''re most looking forward to.

Can''t wait to see everyone there! 🎊';

      -- Send to all confirmed participants
      FOR participant_record IN
        SELECT ep.user_id, p.name
        FROM public.event_participants ep
        JOIN public.profiles p ON p.id = ep.user_id
        WHERE ep.event_id = event_record.id 
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
          '12h Reminder: ' || event_record.title,
          reminder_12h_content,
          'event_reminder',
          jsonb_build_object(
            'event_id', event_record.id,
            'event_title', event_record.title,
            'reminder_type', '12_hours',
            'action_required', false
          )
        );
        
        reminder_count := reminder_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$;

-- Function: trigger_auto_complete_events
CREATE OR REPLACE FUNCTION public.trigger_auto_complete_events()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  completed_count INTEGER;
BEGIN
  SELECT public.auto_complete_past_events() INTO completed_count;
  
  RETURN 'Completed ' || completed_count || ' past events';
END;
$$;

-- Function: trigger_pre_event_reminders
CREATE OR REPLACE FUNCTION public.trigger_pre_event_reminders()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  reminder_count INTEGER;
BEGIN
  SELECT public.send_pre_event_reminders() INTO reminder_count;
  
  RETURN 'Sent ' || reminder_count || ' pre-event reminder notifications';
END;
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: validate_app_preferences
CREATE OR REPLACE FUNCTION public.validate_app_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Ensure personalization_opt is valid
  IF NEW.personalization_opt NOT IN ('full', 'limited', 'minimal') THEN
    RAISE EXCEPTION 'Invalid personalization option: %', NEW.personalization_opt;
  END IF;
  
  -- Ensure message_privacy is valid
  IF NEW.message_privacy NOT IN ('everyone', 'followers', 'nobody') THEN
    RAISE EXCEPTION 'Invalid message privacy option: %', NEW.message_privacy;
  END IF;
  
  -- If personalization is minimal, disable ad personalization
  IF NEW.personalization_opt = 'minimal' THEN
    NEW.ad_personalization := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: wants_email_notifications
CREATE OR REPLACE FUNCTION public.wants_email_notifications(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(email_notifications, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_email_notifications.user_id;
$$;

-- Function: wants_event_messages
CREATE OR REPLACE FUNCTION public.wants_event_messages(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(event_messages, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_event_messages.user_id;
$$;

-- Function: wants_push_notifications
CREATE OR REPLACE FUNCTION public.wants_push_notifications(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(push_notifications, true)
  FROM public.profile_privacy_settings
  WHERE user_id = wants_push_notifications.user_id;
$$;

-- Function: can_view_profile
CREATE OR REPLACE FUNCTION public.can_view_profile(profile_owner_id uuid, viewer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  privacy_setting TEXT;
  is_friend BOOLEAN := false;
  has_permission BOOLEAN := false;
BEGIN
  -- Profile owner can always view their own profile
  IF profile_owner_id = viewer_id THEN
    RETURN true;
  END IF;
  
  -- Get privacy setting
  SELECT profile_visibility INTO privacy_setting
  FROM public.profile_privacy_settings
  WHERE user_id = profile_owner_id;
  
  -- Default to public if no setting exists (since we changed the default)
  IF privacy_setting IS NULL THEN
    privacy_setting := 'public';
  END IF;
  
  -- If profile is public, allow access
  IF privacy_setting = 'public' THEN
    RETURN true;
  END IF;
  
  -- Check if they are friends
  SELECT EXISTS(
    SELECT 1 FROM public.friendships 
    WHERE ((user_id = profile_owner_id AND friend_id = viewer_id) 
           OR (user_id = viewer_id AND friend_id = profile_owner_id))
    AND status = 'accepted'
  ) INTO is_friend;
  
  -- If privacy is friends and they are friends, allow access
  IF privacy_setting = 'friends' AND is_friend THEN
    RETURN true;
  END IF;
  
  -- Check for explicit permission
  SELECT permission_granted INTO has_permission
  FROM public.profile_view_permissions
  WHERE profile_owner_id = can_view_profile.profile_owner_id 
    AND viewer_id = can_view_profile.viewer_id;
  
  RETURN COALESCE(has_permission, false);
END;
$$;

-- Function: notify_new_message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Notify the recipient (if not the sender and recipient exists)
  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id != NEW.sender_id THEN
    INSERT INTO public.notifications (
      user_id, 
      title, 
      content, 
      notification_type,
      metadata,
      created_at
    )
    VALUES (
      NEW.recipient_id,
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      'message',
      jsonb_build_object(
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'message_type', NEW.message_type,
        'event_id', NEW.event_id
      ),
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function: notify_saved_event_participants
CREATE OR REPLACE FUNCTION public.notify_saved_event_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Function: check_rate_limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid DEFAULT NULL, p_ip_address inet DEFAULT NULL, p_endpoint text DEFAULT 'general', p_max_requests integer DEFAULT 100, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE endpoint = p_endpoint
    AND window_start >= check_rate_limit.window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, window_start)
  VALUES (p_user_id, p_ip_address, p_endpoint, now())
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Function: get_user_membership_info
CREATE OR REPLACE FUNCTION public.get_user_membership_info(user_uuid uuid)
RETURNS TABLE(subscription_tier text, is_admin boolean, subscription_id uuid, slot_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.subscription_tier,
    (ms.admin_user_id = user_uuid) as is_admin,
    ms.id as subscription_id,
    sl.id as slot_id
  FROM public.membership_subscriptions ms
  JOIN public.membership_slots sl ON sl.subscription_id = ms.id
  WHERE sl.user_id = user_uuid AND sl.status = 'active';
END;
$$;

-- Function: is_friends_with
CREATE OR REPLACE FUNCTION public.is_friends_with(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE ((user_id = user1_id AND friend_id = user2_id) 
           OR (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted'
  );
$$;

-- Function: is_subscription_member
CREATE OR REPLACE FUNCTION public.is_subscription_member(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_slots 
    WHERE subscription_id = is_subscription_member.subscription_id 
    AND user_id = is_subscription_member.user_id 
    AND status = 'active'
  );
$$;

-- Function: is_subscription_admin
CREATE OR REPLACE FUNCTION public.is_subscription_admin(subscription_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membership_subscriptions 
    WHERE id = subscription_id AND admin_user_id = user_id
  );
$$;

-- Function: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(p_action text, p_resource_type text DEFAULT NULL, p_resource_id uuid DEFAULT NULL, p_success boolean DEFAULT true, p_error_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, 
    success, error_message
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id,
    p_success, p_error_message
  );
END;
$$;

-- Function: sanitize_html_input
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags and their content
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove potentially dangerous HTML tags
  input_text := regexp_replace(input_text, '<(script|iframe|object|embed|form|input|button|link|meta|style)[^>]*>', '', 'gi');
  
  -- Remove javascript: and data: protocols
  input_text := regexp_replace(input_text, '(javascript|data|vbscript):', '', 'gi');
  
  -- Remove on* event handlers (fixed regex)
  input_text := regexp_replace(input_text, E'\\s*on\\w+\\s*=\\s*["\'][^"\']*["\']', '', 'gi');
  
  RETURN input_text;
END;
$$;

-- Function: validate_event_data
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Validate date is not in the past (allow today)
  IF NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date cannot be in the past';
  END IF;
  
  -- Validate future date limit (max 2 years ahead)
  IF NEW.date > CURRENT_DATE + INTERVAL '2 years' THEN
    RAISE EXCEPTION 'Event date cannot be more than 2 years in the future';
  END IF;
  
  -- Validate time format and reasonable hours
  IF NEW.time IS NOT NULL AND (EXTRACT(HOUR FROM NEW.time) < 0 OR EXTRACT(HOUR FROM NEW.time) > 23) THEN
    RAISE EXCEPTION 'Invalid time format';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('active', 'draft', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid event status';
  END IF;
  
  -- Update category validation to include new 'giving-back' category
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'social', 'education', 'sports', 'arts', 'technology', 
    'food', 'fitness', 'outdoors', 'networking', 'giving-back', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid event category';
  END IF;
  
  RETURN NEW;
END;
$$;