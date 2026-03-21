
-- Create function to insert user ratings
CREATE OR REPLACE FUNCTION public.insert_user_ratings(ratings_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to check if user has already rated an event
CREATE OR REPLACE FUNCTION public.check_user_rating_status(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_ratings 
    WHERE event_id = p_event_id AND rating_user_id = p_user_id
  );
$$;
