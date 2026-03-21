
-- Enable RLS on all tables that don't have it yet
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_view_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for profile_privacy_settings
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON public.profile_privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON public.profile_privacy_settings;
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON public.profile_privacy_settings;

CREATE POLICY "Users can view their own privacy settings" 
  ON public.profile_privacy_settings 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" 
  ON public.profile_privacy_settings 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" 
  ON public.profile_privacy_settings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate policies for friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships they're involved in" ON public.friendships;

CREATE POLICY "Users can view their own friendships" 
  ON public.friendships 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests" 
  ON public.friendships 
  FOR INSERT 
  WITH CHECK (auth.uid() = requested_by AND (auth.uid() = user_id OR auth.uid() = friend_id));

CREATE POLICY "Users can update friendships they're involved in" 
  ON public.friendships 
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Drop and recreate policies for profile_view_permissions
DROP POLICY IF EXISTS "Profile owners can manage view permissions" ON public.profile_view_permissions;
DROP POLICY IF EXISTS "Viewers can see their granted permissions" ON public.profile_view_permissions;

CREATE POLICY "Profile owners can manage view permissions" 
  ON public.profile_view_permissions 
  FOR ALL 
  USING (auth.uid() = profile_owner_id);

CREATE POLICY "Viewers can see their granted permissions" 
  ON public.profile_view_permissions 
  FOR SELECT 
  USING (auth.uid() = viewer_id);

-- Drop and recreate policies for security_audit_log
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;

CREATE POLICY "Only admins can view audit logs" 
  ON public.security_audit_log 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add input validation constraints (with IF NOT EXISTS checks)
DO $$ 
BEGIN
  -- Check and add constraints for profiles table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_name_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bio_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK (char_length(bio) <= 500);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_length CHECK (char_length(location) <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_occupation_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_occupation_length CHECK (char_length(occupation) <= 100);
  END IF;
END $$;

DO $$ 
BEGIN
  -- Check and add constraints for events table
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_title_length') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_description_length') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_description_length CHECK (char_length(description) <= 2000);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_location_length') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_location_length CHECK (char_length(location) <= 200);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_attendees_positive') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_attendees_positive CHECK (max_attendees > 0 AND max_attendees <= 1000);
  END IF;
END $$;

-- Create event data validation function
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate date is not in the past (allow today)
  IF NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Event date cannot be in the past';
  END IF;
  
  -- Validate future date limit (max 2 years ahead)
  IF NEW.date > CURRENT_DATE + INTERVAL '2 years' THEN
    RAISE EXCEPTION 'Event date cannot be more than 2 years in the future';
  END IF;
  
  -- Validate time format and reasonable hours
  IF NEW.time IS NOT NULL AND (EXTRACT(HOUR FROM NEW.time) < 0 OR EXTRACT(HOUR FROM NEW.time) > 23) THEN
    RAISE EXCEPTION 'Invalid time format';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('active', 'draft', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid event status';
  END IF;
  
  -- Validate category
  IF NEW.category IS NOT NULL AND NEW.category NOT IN (
    'Sports & Fitness', 'Arts & Culture', 'Food & Drink', 'Technology', 
    'Business & Networking', 'Health & Wellness', 'Education', 'Music', 
    'Outdoor Activities', 'Social', 'Other'
  ) THEN
    RAISE EXCEPTION 'Invalid event category';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event validation
DROP TRIGGER IF EXISTS validate_event_trigger ON public.events;
CREATE TRIGGER validate_event_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_data();

-- Create XSS prevention function (fixed regex patterns)
CREATE OR REPLACE FUNCTION public.sanitize_html_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags and their content
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove potentially dangerous HTML tags
  input_text := regexp_replace(input_text, '<(script|iframe|object|embed|form|input|button|link|meta|style)[^>]*>', '', 'gi');
  
  -- Remove javascript: and data: protocols
  input_text := regexp_replace(input_text, '(javascript|data|vbscript):', '', 'gi');
  
  -- Remove on* event handlers (fixed regex)
  input_text := regexp_replace(input_text, E'\\s*on\\w+\\s*=\\s*["\'][^"\']*["\']', '', 'gi');
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to sanitize profile inputs
CREATE OR REPLACE FUNCTION public.sanitize_profile_inputs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := public.sanitize_html_input(NEW.name);
  NEW.bio := public.sanitize_html_input(NEW.bio);
  NEW.location := public.sanitize_html_input(NEW.location);
  NEW.occupation := public.sanitize_html_input(NEW.occupation);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_profile_trigger ON public.profiles;
CREATE TRIGGER sanitize_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_profile_inputs();

-- Create trigger to sanitize event inputs
CREATE OR REPLACE FUNCTION public.sanitize_event_inputs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title := public.sanitize_html_input(NEW.title);
  NEW.description := public.sanitize_html_input(NEW.description);
  NEW.location := public.sanitize_html_input(NEW.location);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_event_trigger ON public.events;
CREATE TRIGGER sanitize_event_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_event_inputs();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_lookup ON public.profiles(id, name, email);
CREATE INDEX IF NOT EXISTS idx_events_date_status ON public.events(date, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_events_host_status ON public.events(host_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(user_id, friend_id, status);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON public.profile_privacy_settings(user_id);

-- Add rate limiting table for API protection
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_user_or_ip CHECK (user_id IS NOT NULL OR ip_address IS NOT NULL)
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limits (only system should access)
DROP POLICY IF EXISTS "System access only for rate limits" ON public.rate_limits;
CREATE POLICY "System access only for rate limits" 
  ON public.rate_limits 
  FOR ALL 
  USING (false);

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint, window_start);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_endpoint TEXT DEFAULT 'general',
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE endpoint = p_endpoint
    AND window_start >= window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, window_start)
  VALUES (p_user_id, p_ip_address, p_endpoint, now())
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
