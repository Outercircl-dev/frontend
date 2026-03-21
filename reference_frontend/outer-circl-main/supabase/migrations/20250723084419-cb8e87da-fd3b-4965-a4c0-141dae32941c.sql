-- Update the send_pre_event_reminders function to use OuterCircl system account
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
  WHERE username = 'outercircl'
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
      reminder_24h_content := 'Tomorrow''s the day! 🎉 Your activity "' || event_record.title || '" is happening in about 24 hours. 

📍 Location: ' || COALESCE(event_record.location, 'TBD') || '
⏰ Time: ' || COALESCE(event_record.time::text, 'See event details') || '

👕 What to wear: Dress comfortably and weather-appropriately. Check the forecast and dress in layers if needed!

👋 Perfect time to introduce yourself!
Tomorrow you''ll be meeting some amazing new people! Why not break the ice now? Share in the event comments:
• Your name and what you''re excited about
• A fun fact about yourself
• Your experience with this type of activity
• What you''re hoping to get out of tomorrow''s activity

💬 Getting to know each other beforehand makes activities 10x better! You''ll show up feeling like you already have friends waiting for you. Plus, it helps everyone feel more comfortable and excited about meeting up!

✨ Early connections lead to lasting friendships - don''t be shy, everyone''s excited to meet you!

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
      reminder_12h_content := 'Final reminder! 🚨 Your activity "' || event_record.title || '" is happening in about 12 hours!

📍 Location: ' || COALESCE(event_record.location, 'TBD') || '
⏰ Time: ' || COALESCE(event_record.time::text, 'See event details') || '

✅ Last-minute checklist:
• Check the weather and dress accordingly
• Bring water and any personal items you might need
• Plan your route and arrive on time
• Bring your positive energy! 

👋 Last chance to connect before meeting!
If you haven''t introduced yourself yet, now''s the perfect time! Share a quick hello in the event comments:
• Just say hi and share your name
• Mention one thing you''re looking forward to
• Ask if anyone has questions about the location or activity

🤝 The people joining are just as excited to meet you as you are to meet them! A simple introduction goes a long way in making everyone feel welcome and excited.

🎊 In just 12 hours, you''ll be making new memories with new friends. Get ready for an amazing time!

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