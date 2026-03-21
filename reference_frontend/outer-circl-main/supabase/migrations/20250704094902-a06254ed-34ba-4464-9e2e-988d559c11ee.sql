-- Create function to send pre-event reminder notifications
CREATE OR REPLACE FUNCTION public.send_pre_event_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create a function to manually trigger reminder sending
CREATE OR REPLACE FUNCTION public.trigger_pre_event_reminders()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reminder_count INTEGER;
BEGIN
  SELECT public.send_pre_event_reminders() INTO reminder_count;
  
  RETURN 'Sent ' || reminder_count || ' pre-event reminder notifications';
END;
$$;