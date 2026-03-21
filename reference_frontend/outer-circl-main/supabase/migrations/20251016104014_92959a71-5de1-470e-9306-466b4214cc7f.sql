-- Fix invitations_safe view security
-- Drop the existing view
DROP VIEW IF EXISTS public.invitations_safe;

-- Recreate with proper security settings
CREATE VIEW public.invitations_safe
WITH (security_invoker = on)
AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invited_by,
  invitation_token,
  status,
  email_hash,
  expires_at,
  created_at,
  updated_at
FROM public.invitations;

COMMENT ON VIEW public.invitations_safe IS 'Safe view of invitations without encrypted email data, enforces RLS from base table';