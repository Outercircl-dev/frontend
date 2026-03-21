-- Phase 3 Part 1: Setup PII Encryption Infrastructure
-- Sets up encryption functions and columns without migrating data yet

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to profiles_sensitive
ALTER TABLE public.profiles_sensitive
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- Create encryption function using Vault
CREATE OR REPLACE FUNCTION public.encrypt_pii(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from Supabase Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in vault. Run: SELECT vault.create_secret(''pii_encryption_key'', ''your-strong-key'');';
  END IF;
  
  -- Encrypt using pgp_sym_encrypt
  RETURN encode(
    pgp_sym_encrypt(data, encryption_key)::bytea,
    'base64'
  );
END;
$$;

-- Create decryption function using Vault
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from Supabase Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in vault';
  END IF;
  
  -- Decrypt using pgp_sym_decrypt
  RETURN pgp_sym_decrypt(
    decode(encrypted_data, 'base64')::bytea,
    encryption_key
  );
END;
$$;

-- Create helper function to migrate a single profile's PII
CREATE OR REPLACE FUNCTION public.migrate_profile_pii(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_email TEXT;
  profile_phone TEXT;
BEGIN
  -- Get plaintext data
  SELECT email, phone INTO profile_email, profile_phone
  FROM public.profiles_sensitive
  WHERE id = profile_id;
  
  -- Encrypt and update
  UPDATE public.profiles_sensitive
  SET 
    email_encrypted = CASE 
      WHEN profile_email IS NOT NULL AND profile_email != '' 
      THEN public.encrypt_pii(profile_email)
      ELSE NULL
    END,
    phone_encrypted = CASE 
      WHEN profile_phone IS NOT NULL AND profile_phone != '' 
      THEN public.encrypt_pii(profile_phone)
      ELSE NULL
    END,
    encryption_version = 1
  WHERE id = profile_id;
  
  RETURN TRUE;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_sensitive_email_encrypted 
ON public.profiles_sensitive(email_encrypted) 
WHERE email_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_sensitive_phone_encrypted 
ON public.profiles_sensitive(phone_encrypted) 
WHERE phone_encrypted IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.profiles_sensitive.email_encrypted IS 
  'Encrypted email using pgcrypto with key from Supabase Vault (pii_encryption_key)';
COMMENT ON COLUMN public.profiles_sensitive.phone_encrypted IS 
  'Encrypted phone using pgcrypto with key from Supabase Vault (pii_encryption_key)';
COMMENT ON FUNCTION public.encrypt_pii(TEXT) IS
  'Encrypts PII using key from vault.decrypted_secrets[pii_encryption_key]';
COMMENT ON FUNCTION public.decrypt_pii(TEXT) IS
  'Decrypts PII using key from vault.decrypted_secrets[pii_encryption_key]';
  
-- Log infrastructure setup
INSERT INTO public.security_audit_enhanced (
  user_id,
  action,
  resource_type,
  risk_score,
  metadata
) VALUES (
  NULL,
  'pii_encryption_infrastructure_ready',
  'profiles_sensitive',
  5,
  jsonb_build_object(
    'migration', 'phase_3_infrastructure',
    'encryption_method', 'pgcrypto_vault',
    'next_step', 'create_vault_secret',
    'timestamp', now()
  )
);