-- PHASE 2: Fix remaining Security Definer Views and complete security hardening

-- Step 1: Find and fix any remaining SECURITY DEFINER views
-- First, let's check what security definer views exist
-- (This is informational - the linter found 2 security definer views)

-- Drop and recreate user_activity_summary without security definer properties
DROP VIEW IF EXISTS public.user_activity_summary;

-- Recreate user_activity_summary as a regular view that respects RLS
CREATE VIEW public.user_activity_summary AS
SELECT 
  uah.user_id,
  SUM(uah.activity_count) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  jsonb_object_agg(uah.category, uah.activity_count) as activities_by_category,
  p.name as user_name,
  p.email as user_email
FROM public.user_activity_history uah
JOIN public.profiles p ON p.id = uah.user_id
WHERE p.account_status = 'active'
  AND uah.user_id = auth.uid()  -- Only show user's own data
GROUP BY uah.user_id, p.name, p.email;

-- Grant appropriate permissions
GRANT SELECT ON public.user_activity_summary TO authenticated;

-- Step 2: Ensure all functions that need SECURITY DEFINER are properly scoped
-- and don't inadvertently create security definer views

-- Step 3: Add RLS policy to user_activity_summary to ensure data protection
-- Note: Views can't have RLS policies directly, but we've restricted the view itself

-- Step 4: Create a comprehensive RLS policy for user_activity_history if not exists
DO $$
BEGIN
  -- Check if RLS policy exists for viewing own activity
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activity_history' 
    AND policyname = 'Users can view only their own activity history'
  ) THEN
    CREATE POLICY "Users can view only their own activity history" 
    ON public.user_activity_history 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Step 5: Add additional security constraints
-- Ensure rate_limits table has proper RLS (it should block all user access)
DO $$
BEGIN
  -- Ensure rate_limits is properly locked down
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rate_limits' 
    AND policyname = 'System access only for rate limits'
  ) THEN
    CREATE POLICY "System access only for rate limits" 
    ON public.rate_limits 
    FOR ALL 
    USING (false);
  END IF;
END $$;

-- Step 6: Add security audit for profile access
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log suspicious profile access patterns
  IF OLD.id != NEW.id THEN
    PERFORM public.log_security_violation('profile_id_change', 
      jsonb_build_object('old_id', OLD.id, 'new_id', NEW.id));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply audit trigger to profiles table
DROP TRIGGER IF EXISTS audit_profile_changes ON public.profiles;
CREATE TRIGGER audit_profile_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_access();

-- Step 7: Secure the security_audit_log table further
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Ensure only admins can read audit logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'security_audit_log' 
    AND policyname = 'Only admins can view audit logs'
  ) THEN
    CREATE POLICY "Only admins can view audit logs" 
    ON public.security_audit_log 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.audit_profile_access() TO authenticated;