-- Create table to track user activity participation history by category
CREATE TABLE public.user_activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  activity_count INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.user_activity_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own activity history" 
ON public.user_activity_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity history" 
ON public.user_activity_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity history" 
ON public.user_activity_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update user activity history when an event is completed
CREATE OR REPLACE FUNCTION public.update_user_activity_history()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- Only process when event status changes to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Update activity history for all participants who attended
    FOR participant_record IN 
      SELECT ep.user_id
      FROM public.event_participants ep
      WHERE ep.event_id = NEW.id 
      AND ep.status = 'attending'
    LOOP
      -- Insert or update the user's activity history for this category
      INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
      VALUES (
        participant_record.user_id,
        COALESCE(NEW.category, 'other'),
        1,
        NEW.date
      )
      ON CONFLICT (user_id, category) 
      DO UPDATE SET 
        activity_count = user_activity_history.activity_count + 1,
        last_activity_date = GREATEST(user_activity_history.last_activity_date, NEW.date),
        updated_at = now();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating activity history
CREATE TRIGGER update_user_activity_history_trigger
AFTER UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_user_activity_history();

-- Create indexes for better performance
CREATE INDEX idx_user_activity_history_user_id ON public.user_activity_history(user_id);
CREATE INDEX idx_user_activity_history_category ON public.user_activity_history(category);

-- Set up cron job to trigger pre-event reminders every hour
SELECT cron.schedule(
  'send-pre-event-reminders',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := '{"action": "send_reminders"}'::jsonb
    ) as request_id;
  $$
);

-- Set up cron job to auto-complete past events every hour
SELECT cron.schedule(
  'auto-complete-past-events',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
      url := 'https://bommnpdpzmvqufurwwik.supabase.co/functions/v1/auto-complete-events',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbW1ucGRwem12cXVmdXJ3d2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxODg2MzIsImV4cCI6MjA2MTc2NDYzMn0.eZRb_vDDzPYnv2UOaefq7rLnigji9oD7PTQpd_bY5pE"}'::jsonb,
      body := '{"action": "auto_complete"}'::jsonb
    ) as request_id;
  $$
);