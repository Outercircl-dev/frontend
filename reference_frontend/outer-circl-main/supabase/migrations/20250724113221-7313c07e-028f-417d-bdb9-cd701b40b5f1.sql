-- Fix function security by adding search_path
CREATE OR REPLACE FUNCTION public.update_user_reliability_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$;