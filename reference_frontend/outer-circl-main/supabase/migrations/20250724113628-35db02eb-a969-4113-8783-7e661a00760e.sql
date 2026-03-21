-- Update the reliability rating trigger to also send notifications
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
  
  -- Send notification when new rating is received (INSERT only)
  IF TG_OP = 'INSERT' THEN
    -- Get event title
    SELECT title INTO event_title 
    FROM public.events 
    WHERE id = NEW.event_id;
    
    -- Send notification to the rated user
    INSERT INTO public.notifications (
      user_id, 
      title, 
      content, 
      notification_type,
      metadata
    )
    VALUES (
      NEW.rated_user_id,
      'Rating Received',
      'You received a new reliability rating after "' || COALESCE(event_title, 'an activity') || '". Your updated rating is now ' || COALESCE(avg_rating::text, 'being calculated') || '/5.0!',
      'general',
      jsonb_build_object(
        'event_id', NEW.event_id,
        'event_title', event_title,
        'new_rating', avg_rating,
        'action_required', false
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;