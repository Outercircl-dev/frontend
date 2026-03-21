-- Update pre-event reminders to be more concise and focus on introductions
CREATE OR REPLACE FUNCTION public.send_pre_event_reminders()
RETURNS integer
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
  system_user_id UUID;
BEGIN
  -- Try to find OuterCircl system account, fallback to event host
  SELECT id INTO system_user_id
  FROM public.profiles
  WHERE username = 'outercircl_system'
  LIMIT 1;

  -- Find events that need reminders (24h or 12h before)
  FOR event_record IN
    SELECT id, title, date, time, location, description, host_id
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
      reminder_24h_content := '🎉 Tomorrow''s the day! "' || event_record.title || '" starts in 24 hours.

📍 ' || COALESCE(event_record.location, 'TBD') || ' at ' || COALESCE(event_record.time::text, 'TBD') || '

👋 Break the ice now! Introduce yourself in the comments:
• Share your name and one thing you''re excited about
• Tell us a fun fact or what brings you to this activity
• Ask a question to get the conversation started

💬 Everyone''s excited to meet you - say hello! 🌟';

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

      -- Also send as a group message to the event chat
      INSERT INTO public.messages (
        sender_id,
        event_id,
        content,
        message_type,
        created_at
      ) VALUES (
        COALESCE(system_user_id, event_record.host_id),
        event_record.id,
        reminder_24h_content,
        'event',
        NOW()
      );
      
    -- Check if we need to send 12-hour reminder (between 11-13 hours before)
    ELSIF hours_until_event BETWEEN 11 AND 13 THEN
      reminder_12h_content := '🚨 Final reminder! "' || event_record.title || '" starts in 12 hours.

📍 ' || COALESCE(event_record.location, 'TBD') || ' at ' || COALESCE(event_record.time::text, 'TBD') || '

👋 Last chance to introduce yourself! 
Drop a quick hello in the comments - share your name and what you''re looking forward to most.

🤝 See you soon! 🎊';

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

      -- Also send as a group message to the event chat
      INSERT INTO public.messages (
        sender_id,
        event_id,
        content,
        message_type,
        created_at
      ) VALUES (
        COALESCE(system_user_id, event_record.host_id),
        event_record.id,
        reminder_12h_content,
        'event',
        NOW()
      );
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$;