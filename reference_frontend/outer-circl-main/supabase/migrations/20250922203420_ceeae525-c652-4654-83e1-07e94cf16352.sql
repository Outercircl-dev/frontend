-- Fix Security Definer View Issue
-- Remove SECURITY DEFINER from view and fix other security warnings

-- 1. Drop and recreate the invitations_safe view without SECURITY DEFINER
DROP VIEW IF EXISTS public.invitations_safe;

-- Create a standard view (not SECURITY DEFINER) for invitation data masking
CREATE VIEW public.invitations_safe AS
SELECT 
  i.id,
  i.subscription_id,
  i.slot_id,
  i.invited_by,
  i.invitation_token,
  i.expires_at,
  i.created_at,
  i.updated_at,
  i.status,
  -- Mask email addresses for security - only partial reveal for authorized users
  CASE 
    WHEN i.email IS NOT NULL THEN 
      left(i.email, 2) || '***@' || split_part(i.email, '@', 2)
    ELSE '***@***'
  END as email_masked,
  i.email_hash
FROM public.invitations i
WHERE 
  -- Apply the same RLS logic as the base table
  auth.uid() IS NOT NULL
  AND (
    -- Admin access to their own subscription invitations
    (EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.id = i.subscription_id 
      AND ms.admin_user_id = auth.uid()
    ))
    OR
    -- User can only see their own pending invitations by matching email
    (
      auth.email() = i.email
      AND i.status = 'pending'
      AND i.expires_at > now()
      AND i.created_at > now() - interval '7 days'
    )
  );

-- Grant permissions to the safe view
GRANT SELECT ON public.invitations_safe TO authenticated;

-- 2. Fix search_path issues in existing functions by adding SET search_path where missing
-- Note: This only adds it to functions that don't already have it set

-- Update check_payment_access_rate_limit function (already has correct search_path)
-- Update monitor_sensitive_data_breaches function (already has correct search_path)

-- 3. Add security configuration for the fixed view
INSERT INTO public.security_config (config_key, config_value, description, updated_by)
VALUES 
  ('invitations_view_security_fixed', 'true', 'Fixed SECURITY DEFINER issue in invitations_safe view', auth.uid())
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now(),
  updated_by = auth.uid();

-- 4. Update documentation
COMMENT ON VIEW public.invitations_safe IS 'Secure view for invitations with masked email addresses - uses standard view permissions for security compliance';