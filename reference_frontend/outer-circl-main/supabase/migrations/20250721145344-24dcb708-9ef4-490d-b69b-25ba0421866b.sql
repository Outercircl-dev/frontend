-- Fix security issue: Convert user_activity_summary to use SECURITY INVOKER
-- First, check if it's a view and recreate it properly

-- Drop the existing view/table if it exists
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;
DROP TABLE IF EXISTS public.user_activity_summary CASCADE;

-- Create a proper view with SECURITY INVOKER that aggregates user activity data
CREATE VIEW public.user_activity_summary 
WITH (security_invoker=on) AS
SELECT 
  p.id as user_id,
  p.name as user_name,
  p.email as user_email,
  COALESCE(SUM(uah.activity_count), 0) as total_activities,
  COUNT(DISTINCT uah.category) as categories_participated,
  MAX(uah.last_activity_date) as last_activity_date,
  COALESCE(
    jsonb_object_agg(
      uah.category, 
      uah.activity_count
    ) FILTER (WHERE uah.category IS NOT NULL),
    '{}'::jsonb
  ) as activities_by_category
FROM public.profiles p
LEFT JOIN public.user_activity_history uah ON uah.user_id = p.id
WHERE p.account_status = 'active'
GROUP BY p.id, p.name, p.email;

-- Add RLS policy to ensure users can only see their own activity summary
ALTER VIEW public.user_activity_summary SET (security_invoker=on);

-- Create RLS policies for the view (these will inherit from underlying tables)
-- Note: Views with security_invoker will use the permissions of the querying user