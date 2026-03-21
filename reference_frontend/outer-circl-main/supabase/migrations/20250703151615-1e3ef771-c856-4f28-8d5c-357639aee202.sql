-- Create table for saved/bookmarked events
CREATE TABLE IF NOT EXISTS public.saved_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS on saved_events
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved_events
CREATE POLICY "Users can manage their own saved events"
ON public.saved_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to notify users when someone joins their saved events
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
    INSERT INTO public.notifications (user_id, title, content, notification_type)
    VALUES (
      saved_user_record.user_id,
      'New Participant in Saved Event',
      COALESCE(new_participant_name, 'Someone') || ' joined "' || event_record.title || '" that you saved',
      'event'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for saved events notifications
DROP TRIGGER IF EXISTS notify_saved_event_participants ON public.event_participants;
CREATE TRIGGER notify_saved_event_participants
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_saved_event_participants();