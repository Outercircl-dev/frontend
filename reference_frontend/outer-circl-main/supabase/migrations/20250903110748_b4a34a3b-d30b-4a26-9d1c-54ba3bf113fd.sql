-- Fix ambiguous activity_count reference in get_user_activity_stats function
-- Drop and recreate the function with proper table aliases

DROP FUNCTION IF EXISTS public.get_user_activity_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_user_activity_stats(p_user_id uuid)
RETURNS TABLE(category text, activity_count integer, last_activity_date date, total_activities bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;