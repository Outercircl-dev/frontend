-- PHASE 3: Complete Security Hardening - Final Version (Fixed Column Names)

-- Step 1: Fix user_activity_summary RLS protection
-- Drop and recreate with proper RLS enforcement
DROP VIEW IF EXISTS public.user_activity_summary;

-- Create as a table instead of view to enable proper RLS
CREATE TABLE IF NOT EXISTS public.user_activity_summary_secure (
  user_id uuid NOT NULL,
  total_activities bigint DEFAULT 0,
  categories_participated bigint DEFAULT 0,
  last_activity_date date,
  activities_by_category jsonb DEFAULT '{}',
  user_name text,
  user_email text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_summary_secure_pkey PRIMARY KEY (user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.user_activity_summary_secure ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user activity summary
CREATE POLICY "Users can only view their own activity summary" 
ON public.user_activity_summary_secure 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 2: Fix profiles_public RLS protection
-- Drop and recreate with proper access control
DROP VIEW IF EXISTS public.profiles_public;

-- Create as a view with explicit RLS-compatible query
CREATE VIEW public.profiles_public AS
SELECT 
  p.id,
  p.name,
  p.username, 
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.reliability_rating,
  p.membership_tier,
  p.interests,
  p.languages,
  p.created_at
FROM public.profiles p
WHERE p.account_status = 'active'
  AND (
    -- User viewing their own profile
    p.id = auth.uid() OR
    -- Public profiles
    EXISTS (
      SELECT 1 FROM public.profile_privacy_settings pps
      WHERE pps.user_id = p.id 
      AND pps.profile_visibility = 'public'
    ) OR
    -- Friends can see follower-only profiles
    (
      EXISTS (
        SELECT 1 FROM public.profile_privacy_settings pps
        WHERE pps.user_id = p.id 
        AND pps.profile_visibility = 'followers'
      ) AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE ((f.user_id = p.id AND f.friend_id = auth.uid()) OR
               (f.user_id = auth.uid() AND f.friend_id = p.id))
        AND f.status = 'accepted'
      )
    )
  );

-- Grant proper permissions
GRANT SELECT ON public.profiles_public TO authenticated;

-- Step 3: Restrict event discovery to authenticated users only
-- Drop the overly permissive public discovery policy
DROP POLICY IF EXISTS "Discovery of public active events" ON public.events;

-- Create a more secure policy for event discovery
CREATE POLICY "Authenticated users can discover public events" 
ON public.events 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  status = 'active' AND 
  date >= CURRENT_DATE
);

-- Step 4: Create function to populate activity summary securely
CREATE OR REPLACE FUNCTION public.refresh_user_activity_summary(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  activity_data RECORD;
BEGIN
  -- Only allow users to refresh their own summary
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: can only refresh own activity summary';
  END IF;

  -- Calculate user activity data
  SELECT 
    SUM(uah.activity_count) as total_activities,
    COUNT(DISTINCT uah.category) as categories_participated,
    MAX(uah.last_activity_date) as last_activity_date,
    jsonb_object_agg(uah.category, uah.activity_count) as activities_by_category
  INTO activity_data
  FROM public.user_activity_history uah
  WHERE uah.user_id = target_user_id;

  -- Get user profile data
  INSERT INTO public.user_activity_summary_secure (
    user_id, 
    total_activities, 
    categories_participated, 
    last_activity_date, 
    activities_by_category,
    user_name,
    user_email,
    updated_at
  )
  SELECT 
    target_user_id,
    COALESCE(activity_data.total_activities, 0),
    COALESCE(activity_data.categories_participated, 0),
    activity_data.last_activity_date,
    COALESCE(activity_data.activities_by_category, '{}'),
    p.name,
    p.email,
    now()
  FROM public.profiles p
  WHERE p.id = target_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_activities = EXCLUDED.total_activities,
    categories_participated = EXCLUDED.categories_participated,
    last_activity_date = EXCLUDED.last_activity_date,
    activities_by_category = EXCLUDED.activities_by_category,
    user_name = EXCLUDED.user_name,
    user_email = EXCLUDED.user_email,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Step 5: Add comprehensive INSERT/UPDATE/DELETE security logging
CREATE OR REPLACE FUNCTION public.log_data_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log data modifications for audit trail
  PERFORM public.log_security_violation(
    TG_OP || '_operation', 
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'user_id', auth.uid(),
      'timestamp', now(),
      'record_id', COALESCE(NEW.id, OLD.id)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply security logging to sensitive tables for INSERT/UPDATE/DELETE only
DROP TRIGGER IF EXISTS log_profiles_modifications ON public.profiles;
CREATE TRIGGER log_profiles_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_data_modification();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_activity_summary_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_activity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_data_modification() TO authenticated;

-- Step 6: Add additional rate limiting configuration for sensitive operations
INSERT INTO public.security_config (config_key, config_value, description) 
VALUES 
  ('max_profile_views_per_hour', '100', 'Maximum profile views per user per hour'),
  ('max_event_queries_per_minute', '30', 'Maximum event queries per user per minute'),
  ('suspicious_activity_threshold', '50', 'Threshold for marking activity as suspicious')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Step 7: Update existing functions to be more secure
-- Make sure our event functions respect the new security model
CREATE OR REPLACE FUNCTION public.get_secure_user_events(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  event_date date,
  event_time time without time zone,
  location text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow users to get their own events or events they can view
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: can only view own events';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date as event_date,
    e.time as event_time,
    e.location,
    e.status
  FROM public.events e
  WHERE e.host_id = p_user_id
     OR public.is_event_participant(e.id, p_user_id);
END;
$$;

-- Grant permissions for the new secure function
GRANT EXECUTE ON FUNCTION public.get_secure_user_events(uuid) TO authenticated;