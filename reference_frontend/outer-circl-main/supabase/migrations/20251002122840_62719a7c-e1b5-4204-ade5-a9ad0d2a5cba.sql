-- Encrypt existing plain text emails in invitations table
UPDATE public.invitations
SET 
  email_encrypted = encode(encrypt(email::bytea, 'encryption-key-placeholder'::bytea, 'aes'), 'base64'),
  email_hash = encode(digest(email, 'sha256'), 'hex')
WHERE email_encrypted IS NULL OR email_hash IS NULL;

-- Create a function to mask emails for the safe view
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  local_part text;
  domain_part text;
  at_position integer;
BEGIN
  IF email IS NULL THEN
    RETURN NULL;
  END IF;
  
  at_position := position('@' in email);
  IF at_position = 0 THEN
    RETURN '***';
  END IF;
  
  local_part := substring(email from 1 for at_position - 1);
  domain_part := substring(email from at_position);
  
  -- Show first 2 chars of local part, mask the rest
  IF length(local_part) <= 2 THEN
    RETURN local_part || '***' || domain_part;
  ELSE
    RETURN substring(local_part from 1 for 2) || '***' || domain_part;
  END IF;
END;
$$;

-- Recreate the invitations_safe view with proper masking
DROP VIEW IF EXISTS public.invitations_safe;
CREATE VIEW public.invitations_safe AS
SELECT 
  id,
  subscription_id,
  slot_id,
  invited_by,
  mask_email(email) as email_masked,
  email_hash,
  status,
  invitation_token,
  expires_at,
  created_at,
  updated_at
FROM public.invitations;

COMMENT ON VIEW public.invitations_safe IS 'Safe view of invitations with masked emails. Access controlled by base table RLS policies.';

-- Add trigger to automatically encrypt emails on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_invitation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt the email and create hash
  NEW.email_encrypted := encode(encrypt(NEW.email::bytea, 'encryption-key-placeholder'::bytea, 'aes'), 'base64');
  NEW.email_hash := encode(digest(NEW.email, 'sha256'), 'hex');
  
  -- Log the invitation creation for security monitoring
  PERFORM public.log_security_event_secure(
    'invitation_email_encrypted',
    'invitations',
    NEW.id,
    true,
    jsonb_build_object(
      'email_hash', NEW.email_hash,
      'invited_by', NEW.invited_by,
      'subscription_id', NEW.subscription_id
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for email encryption
DROP TRIGGER IF EXISTS encrypt_invitation_email_trigger ON public.invitations;
CREATE TRIGGER encrypt_invitation_email_trigger
BEFORE INSERT OR UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_invitation_email();

-- Add index on email_hash for faster lookups without exposing plain text
CREATE INDEX IF NOT EXISTS idx_invitations_email_hash ON public.invitations(email_hash);

-- Add constraint to ensure email encryption is always present for new records
ALTER TABLE public.invitations 
ADD CONSTRAINT email_must_be_encrypted 
CHECK (email_encrypted IS NOT NULL AND email_hash IS NOT NULL);