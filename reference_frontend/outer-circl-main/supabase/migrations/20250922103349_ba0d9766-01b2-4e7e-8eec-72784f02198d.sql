-- Create trigger to automatically send welcome messages when users join events
CREATE OR REPLACE FUNCTION public.send_welcome_message_on_join()
RETURNS TRIGGER AS $$
DECLARE
  event_data RECORD;
  host_data RECORD;
  participant_data RECORD;
BEGIN
  -- Only trigger for new attendees, not updates
  IF TG_OP = 'INSERT' AND NEW.status = 'attending' THEN
    -- Get event details
    SELECT * INTO event_data
    FROM public.events 
    WHERE id = NEW.event_id;
    
    -- Get host details
    SELECT name, username INTO host_data
    FROM public.profiles 
    WHERE id = event_data.host_id;
    
    -- Get participant details  
    SELECT name, username INTO participant_data
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    -- Call the welcome message edge function
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-welcome-message',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := json_build_object(
        'eventId', NEW.event_id,
        'participantId', NEW.user_id
      )::jsonb
    );
    
    -- Schedule reminders for the event if not already scheduled
    -- This ensures all three reminder types (24h, 12h, 2h) are set up
    PERFORM public.schedule_event_reminders(NEW.event_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_welcome_message_on_join ON public.event_participants;
CREATE TRIGGER trigger_welcome_message_on_join
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message_on_join();

-- Create function to schedule all event reminders
CREATE OR REPLACE FUNCTION public.schedule_event_reminders(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  event_datetime TIMESTAMP WITH TIME ZONE;
  event_record RECORD;
  reminder_times RECORD;
BEGIN
  -- Get event details
  SELECT * INTO event_record
  FROM public.events 
  WHERE id = p_event_id 
  AND status = 'active'
  AND date >= CURRENT_DATE;
  
  IF NOT FOUND THEN
    RETURN; -- Event not found or not active/future
  END IF;
  
  -- Calculate event datetime
  event_datetime := event_record.date;
  IF event_record.time IS NOT NULL THEN
    event_datetime := event_record.date + event_record.time;
  ELSE
    event_datetime := event_record.date + TIME '12:00:00';
  END IF;
  
  -- Only schedule if event is more than 2 hours away
  IF event_datetime <= NOW() + INTERVAL '2 hours' THEN
    RETURN;
  END IF;
  
  -- Schedule 24h reminder if event is more than 24 hours away
  IF event_datetime > NOW() + INTERVAL '24 hours' THEN
    INSERT INTO public.scheduled_reminders (
      event_id,
      reminder_type,
      scheduled_for,
      created_at
    ) VALUES (
      p_event_id,
      '24h',
      event_datetime - INTERVAL '24 hours',
      NOW()
    ) ON CONFLICT (event_id, reminder_type) DO NOTHING;
  END IF;
  
  -- Schedule 12h reminder if event is more than 12 hours away
  IF event_datetime > NOW() + INTERVAL '12 hours' THEN
    INSERT INTO public.scheduled_reminders (
      event_id,
      reminder_type,
      scheduled_for,
      created_at
    ) VALUES (
      p_event_id,
      '12h',
      event_datetime - INTERVAL '12 hours',
      NOW()
    ) ON CONFLICT (event_id, reminder_type) DO NOTHING;
  END IF;
  
  -- Always schedule 2h reminder
  INSERT INTO public.scheduled_reminders (
    event_id,
    reminder_type,
    scheduled_for,
    created_at
  ) VALUES (
    p_event_id,
    '2h',
    event_datetime - INTERVAL '2 hours',
    NOW()
  ) ON CONFLICT (event_id, reminder_type) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create table for scheduled reminders
CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '12h', '2h')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate reminders for same event and type
  UNIQUE(event_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Only allow system access to scheduled reminders
CREATE POLICY "System access only for scheduled reminders"
ON public.scheduled_reminders
FOR ALL 
TO authenticated
USING (false)
WITH CHECK (false);

-- Create function to process scheduled reminders
CREATE OR REPLACE FUNCTION public.process_scheduled_reminders()
RETURNS INTEGER AS $$
DECLARE
  reminder_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  -- Find reminders that need to be sent
  FOR reminder_record IN
    SELECT sr.*, e.title, e.date, e.time, e.location
    FROM public.scheduled_reminders sr
    JOIN public.events e ON e.id = sr.event_id
    WHERE sr.sent_at IS NULL
    AND sr.scheduled_for <= NOW()
    AND e.status = 'active'
    ORDER BY sr.scheduled_for
  LOOP
    -- Call the reminder edge function
    PERFORM net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-enhanced-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := json_build_object(
        'eventId', reminder_record.event_id,
        'reminderType', reminder_record.reminder_type
      )::jsonb
    );
    
    -- Mark as sent
    UPDATE public.scheduled_reminders 
    SET sent_at = NOW()
    WHERE id = reminder_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;