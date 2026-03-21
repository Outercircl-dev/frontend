-- Create a function to get user activity statistics
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(p_user_id UUID)
RETURNS TABLE(
  category TEXT,
  activity_count INTEGER,
  last_activity_date DATE,
  total_activities BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uah.category,
    uah.activity_count,
    uah.last_activity_date,
    SUM(uah.activity_count) OVER() as total_activities
  FROM public.user_activity_history uah
  WHERE uah.user_id = p_user_id
  ORDER BY uah.activity_count DESC, uah.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to manually update activity history (for existing data)
CREATE OR REPLACE FUNCTION public.populate_user_activity_history()
RETURNS INTEGER AS $$
DECLARE
  participant_record RECORD;
  event_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Get all completed events with their participants
  FOR event_record IN
    SELECT id, category, date, status
    FROM public.events
    WHERE status = 'completed'
    AND date IS NOT NULL
  LOOP
    -- Get all participants who attended this event
    FOR participant_record IN
      SELECT ep.user_id
      FROM public.event_participants ep
      WHERE ep.event_id = event_record.id 
      AND ep.status = 'attending'
    LOOP
      -- Insert or update the user's activity history for this category
      INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
      VALUES (
        participant_record.user_id,
        COALESCE(event_record.category, 'other'),
        1,
        event_record.date
      )
      ON CONFLICT (user_id, category) 
      DO UPDATE SET 
        activity_count = user_activity_history.activity_count + 1,
        last_activity_date = GREATEST(user_activity_history.last_activity_date, event_record.date),
        updated_at = now();
        
      updated_count := updated_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a view for easy access to user activity summaries
CREATE OR REPLACE VIEW public.user_activity_summary AS
SELECT 
  p.id as user_id,
  p.name as user_name,
  p.email as user_email,
  COALESCE(SUM(uah.activity_count), 0) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  jsonb_object_agg(
    COALESCE(uah.category, 'none'), 
    COALESCE(uah.activity_count, 0)
  ) FILTER (WHERE uah.category IS NOT NULL) as activities_by_category
FROM public.profiles p
LEFT JOIN public.user_activity_history uah ON p.id = uah.user_id
GROUP BY p.id, p.name, p.email;

-- Create RLS policy for the view
ALTER VIEW public.user_activity_summary SET (security_barrier = true);

-- Create RLS policies for accessing user activity stats
CREATE POLICY "Users can view their own activity stats" 
ON public.user_activity_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a function to track activity participation in real-time
CREATE OR REPLACE FUNCTION public.track_activity_participation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when someone joins an event (status = 'attending')
  IF NEW.status = 'attending' AND (OLD IS NULL OR OLD.status != 'attending') THEN
    -- Get event details
    INSERT INTO public.user_activity_history (user_id, category, activity_count, last_activity_date)
    SELECT 
      NEW.user_id,
      COALESCE(e.category, 'other'),
      1,
      e.date
    FROM public.events e
    WHERE e.id = NEW.event_id
    ON CONFLICT (user_id, category) 
    DO UPDATE SET 
      activity_count = user_activity_history.activity_count + 1,
      last_activity_date = GREATEST(user_activity_history.last_activity_date, EXCLUDED.last_activity_date),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for real-time activity tracking when users join events
CREATE TRIGGER track_activity_participation_trigger
AFTER INSERT OR UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.track_activity_participation();

-- Populate existing data
SELECT public.populate_user_activity_history();