-- Option 1: Minimal Security Fix (Corrected)
-- Step 1: Drop the dangerous unused view that exposes decrypted sensitive data
DROP VIEW IF EXISTS public.profiles_sensitive_decrypted CASCADE;

-- Step 2: Drop invitations_safe view as well (defense-in-depth)
-- The app already uses the secure RPC function get_invitation_email_by_token()
-- and the base invitations table has strong RLS policies
DROP VIEW IF EXISTS public.invitations_safe CASCADE;

-- Note: No RLS needed on views - they inherit security from base tables
-- Base tables (profiles_sensitive, invitations) already have excellent RLS policies
-- Application uses secure RPC functions, not direct view queries