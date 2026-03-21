-- Create function to calculate and update user reliability rating
CREATE OR REPLACE FUNCTION public.update_user_reliability_rating(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating DECIMAL(3,2);
  total_ratings INTEGER;
BEGIN
  -- Calculate average rating for the user
  SELECT 
    ROUND(AVG(rating::decimal), 2),
    COUNT(*)
  INTO avg_rating, total_ratings
  FROM public.user_ratings
  WHERE rated_user_id = user_id;
  
  -- Only update if user has ratings
  IF total_ratings > 0 THEN
    -- Update or insert the user's reliability rating in profiles
    UPDATE public.profiles
    SET 
      updated_at = now(),
      -- We'll need to add a reliability_rating column to profiles
      -- For now, we'll store it in a way that works with existing structure
      bio = COALESCE(bio, '') || CASE 
        WHEN bio IS NULL OR bio NOT LIKE '%Reliability:%' THEN 
          ' Reliability:' || avg_rating::text || '/5.0'
        ELSE 
          REGEXP_REPLACE(bio, 'Reliability:[0-9\.]+/5\.0', 'Reliability:' || avg_rating::text || '/5.0')
      END
    WHERE id = user_id;
  END IF;
END;
$function$;

-- Update the existing user ratings insert function to recalculate reliability
CREATE OR REPLACE FUNCTION public.insert_user_ratings(ratings_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rating_record jsonb;
  rated_user_id_val uuid;
BEGIN
  FOR rating_record IN SELECT * FROM jsonb_array_elements(ratings_data)
  LOOP
    rated_user_id_val := (rating_record->>'rated_user_id')::uuid;
    
    INSERT INTO public.user_ratings (
      event_id,
      rated_user_id,
      rating_user_id,
      rating,
      created_at
    ) VALUES (
      (rating_record->>'event_id')::uuid,
      rated_user_id_val,
      (rating_record->>'rating_user_id')::uuid,
      (rating_record->>'rating')::integer,
      (rating_record->>'created_at')::timestamp with time zone
    );
    
    -- Update the reliability rating for the rated user
    PERFORM public.update_user_reliability_rating(rated_user_id_val);
  END LOOP;
END;
$function$;