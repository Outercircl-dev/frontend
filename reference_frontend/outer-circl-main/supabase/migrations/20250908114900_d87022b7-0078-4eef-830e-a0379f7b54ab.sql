-- Fix Security Definer View Issue

-- Drop the problematic security definer view
DROP VIEW IF EXISTS public.invitations_secure;

-- Instead of a view, create a secure function to get masked invitation data
CREATE OR REPLACE FUNCTION public.get_invitation_safe(p_invitation_token UUID)
RETURNS TABLE(
  id UUID,
  subscription_id UUID,
  invitation_token UUID,
  expires_at TIMESTAMPTZ,
  status TEXT,
  email_masked TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.subscription_id,
    i.invitation_token,
    i.expires_at,
    i.status,
    -- Mask email for security - only show first 2 characters
    LEFT(i.email, 2) || '****@' || SPLIT_PART(i.email, '@', 2) as email_masked
  FROM public.invitations i
  WHERE i.invitation_token = p_invitation_token
    AND i.status = 'pending' 
    AND i.expires_at > now()
  LIMIT 1;
END;
$$;

-- Log completion of security fix
SELECT 'Security Definer View removed and replaced with secure function for invitation data access' as security_fix_status;