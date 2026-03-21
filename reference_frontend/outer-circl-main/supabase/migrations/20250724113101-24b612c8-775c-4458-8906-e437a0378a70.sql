-- Add reliability rating field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reliability_rating DECIMAL(3,2) DEFAULT NULL;

-- Update existing rating to 5 stars
UPDATE user_ratings 
SET rating = 5, created_at = NOW()
WHERE event_id = '200abd3a-15b5-4d4e-b67e-66f91dfd22a3'
AND rated_user_id = 'b0c72031-4c30-4d56-ad4d-9a595d1a64cf'
AND rating_user_id = '63abaa68-c98b-4e72-8c40-4b2cafc7cf55';

-- Create function to calculate and update user reliability rating
CREATE OR REPLACE FUNCTION public.update_user_reliability_rating()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update reliability rating when ratings change
DROP TRIGGER IF EXISTS update_reliability_rating_trigger ON public.user_ratings;
CREATE TRIGGER update_reliability_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reliability_rating();

-- Update all existing users' reliability ratings
UPDATE public.profiles 
SET reliability_rating = (
  SELECT ROUND(AVG(ur.rating), 2)
  FROM public.user_ratings ur
  WHERE ur.rated_user_id = profiles.id
  GROUP BY ur.rated_user_id
)
WHERE id IN (
  SELECT DISTINCT rated_user_id 
  FROM public.user_ratings
);