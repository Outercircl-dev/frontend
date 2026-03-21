-- Add anonymous ratings and 24-hour time window for user ratings

-- First, add a timestamp column to track when the event was completed
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Update existing completed events to set completed_at to updated_at
UPDATE public.events 
SET completed_at = updated_at 
WHERE status = 'completed' AND completed_at IS NULL;

-- Create a trigger to set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION public.set_event_completed_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set completed_at when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS set_event_completed_at_trigger ON public.events;
CREATE TRIGGER set_event_completed_at_trigger
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_completed_at();

-- Update RLS policy to enforce 24-hour rating window
-- Replace the existing policy with one that checks the time window
DROP POLICY IF EXISTS "Users can rate other event participants" ON public.user_ratings;

CREATE POLICY "Users can rate other event participants within 24 hours" 
ON public.user_ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = rating_user_id 
  AND auth.uid() <> rated_user_id 
  AND EXISTS (
    SELECT 1
    FROM event_participants ep1
    WHERE ep1.event_id = user_ratings.event_id 
    AND ep1.user_id = auth.uid() 
    AND ep1.status = 'attending'
  )
  AND EXISTS (
    SELECT 1
    FROM event_participants ep2
    WHERE ep2.event_id = user_ratings.event_id 
    AND ep2.user_id = user_ratings.rated_user_id 
    AND ep2.status = 'attending'
  )
  AND EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = user_ratings.event_id 
    AND e.status = 'completed'
    AND e.completed_at IS NOT NULL
    AND e.completed_at > NOW() - INTERVAL '24 hours'
  )
);

-- Update the notification function to make ratings anonymous
CREATE OR REPLACE FUNCTION public.update_user_reliability_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  event_title TEXT;
BEGIN
  -- Calculate average rating for the user
  SELECT ROUND(AVG(rating), 2) INTO avg_rating
  FROM public.user_ratings
  WHERE rated_user_id = COALESCE(NEW.rated_user_id, OLD.rated_user_id);
  
  -- Update the user's reliability rating in profiles
  UPDATE public.profiles 
  SET reliability_rating = avg_rating,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.rated_user_id, OLD.rated_user_id);
  
  -- Send anonymous notification when new rating is received (INSERT only)
  IF TG_OP = 'INSERT' THEN
    -- Get event title
    SELECT title INTO event_title 
    FROM public.events 
    WHERE id = NEW.event_id;
    
    -- Send anonymous notification to the rated user
    INSERT INTO public.notifications (
      user_id, 
      title, 
      content, 
      notification_type,
      metadata
    )
    VALUES (
      NEW.rated_user_id,
      'Anonymous Rating Received',
      'You received an anonymous reliability rating after "' || COALESCE(event_title, 'an activity') || '". Your updated rating is now ' || COALESCE(avg_rating::text, 'being calculated') || '/5.0!',
      'general',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'event_title', event_title,
        'new_rating', avg_rating,
        'anonymous', true,
        'action_required', false
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;