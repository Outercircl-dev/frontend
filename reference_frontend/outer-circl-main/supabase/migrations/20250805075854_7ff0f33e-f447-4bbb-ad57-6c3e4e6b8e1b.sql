-- Update events table to support unlimited participants for premium users
-- Add validation for max_attendees based on membership tier
CREATE OR REPLACE FUNCTION public.validate_event_max_attendees()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
BEGIN
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = NEW.host_id;
  
  -- For premium users, allow unlimited (null or very high numbers)
  IF user_membership_tier = 'premium' THEN
    -- Allow null (unlimited) or any positive number
    IF NEW.max_attendees IS NOT NULL AND NEW.max_attendees <= 0 THEN
      RAISE EXCEPTION 'Max attendees must be positive or null for unlimited';
    END IF;
  ELSE
    -- Standard users limited to 4 participants
    IF NEW.max_attendees IS NULL OR NEW.max_attendees > 4 THEN
      NEW.max_attendees := 4;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for max_attendees validation
DROP TRIGGER IF EXISTS validate_max_attendees_trigger ON public.events;
CREATE TRIGGER validate_max_attendees_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_max_attendees();

-- Update the recurring activity limits function to support custom patterns for premium
CREATE OR REPLACE FUNCTION public.check_recurring_activity_limits(p_user_id uuid, p_is_recurring boolean, p_recurring_type text DEFAULT NULL::text, p_recurrence_pattern text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
  current_recurring_count integer;
  monthly_limit integer;
BEGIN
  -- Get user's membership tier
  SELECT membership_tier INTO user_membership_tier
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- If not creating a recurring event, always allow
  IF NOT p_is_recurring THEN
    RETURN true;
  END IF;
  
  -- Set limits based on membership tier
  IF user_membership_tier = 'premium' THEN
    -- Premium users get unlimited recurring activities
    RETURN true;
  ELSE
    -- Standard users limited to 2 per month
    monthly_limit := 2;
    
    -- Only allow basic patterns for standard users
    IF p_recurrence_pattern IS NOT NULL AND p_recurrence_pattern NOT IN ('weekly', 'bi-weekly', 'monthly') THEN
      RAISE EXCEPTION 'Custom recurring patterns require Premium membership';
    END IF;
  END IF;
  
  -- Count recurring events created this month by this user
  SELECT COUNT(*) INTO current_recurring_count
  FROM public.events
  WHERE host_id = p_user_id
    AND is_recurring = true
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
  
  -- Check if user can create more recurring events
  RETURN current_recurring_count < monthly_limit;
END;
$function$;

-- Update the enforcement trigger to use the new function
CREATE OR REPLACE FUNCTION public.enforce_recurring_activity_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
BEGIN
  -- Only check on INSERT for recurring events
  IF TG_OP = 'INSERT' AND NEW.is_recurring = true THEN
    -- Get user's membership tier
    SELECT membership_tier INTO user_membership_tier
    FROM public.profiles
    WHERE id = NEW.host_id;
    
    -- Set recurring_type based on membership if not already set
    IF NEW.recurring_type IS NULL THEN
      IF user_membership_tier = 'premium' THEN
        NEW.recurring_type := 'premium';
      ELSE
        NEW.recurring_type := 'standard';
      END IF;
    END IF;
    
    -- Check limits (this now includes pattern validation for standard users)
    IF NOT public.check_recurring_activity_limits(NEW.host_id, NEW.is_recurring, NEW.recurring_type, NEW.recurrence_pattern) THEN
      RAISE EXCEPTION 'You have reached your monthly limit for recurring activities or this pattern requires Premium membership. Standard users can create up to 2 recurring activities per month with basic patterns. Upgrade to Premium for unlimited recurring activities with custom patterns.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add support for custom recurring patterns (for premium users)
-- Add new recurrence pattern options
COMMENT ON COLUMN public.events.recurrence_pattern IS 'Standard patterns: weekly, bi-weekly, monthly. Premium patterns: daily, custom-weekly, custom-monthly, quarterly';

-- Function to validate recurrence end count based on membership
CREATE OR REPLACE FUNCTION public.validate_recurrence_end_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_membership_tier text;
  max_occurrences integer;
BEGIN
  -- Only validate for recurring events
  IF NEW.is_recurring = true AND NEW.recurrence_end_count IS NOT NULL THEN
    -- Get user's membership tier
    SELECT membership_tier INTO user_membership_tier
    FROM public.profiles
    WHERE id = NEW.host_id;
    
    -- Set limits based on membership tier
    IF user_membership_tier = 'premium' THEN
      max_occurrences := 100; -- Premium users get up to 100 occurrences
    ELSE
      max_occurrences := 10;  -- Standard users get up to 10 occurrences
    END IF;
    
    -- Validate the count
    IF NEW.recurrence_end_count > max_occurrences THEN
      RAISE EXCEPTION 'Recurrence end count cannot exceed % occurrences for % users', max_occurrences, user_membership_tier;
    END IF;
    
    IF NEW.recurrence_end_count < 1 THEN
      RAISE EXCEPTION 'Recurrence end count must be at least 1';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for recurrence end count validation
DROP TRIGGER IF EXISTS validate_recurrence_end_count_trigger ON public.events;
CREATE TRIGGER validate_recurrence_end_count_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recurrence_end_count();