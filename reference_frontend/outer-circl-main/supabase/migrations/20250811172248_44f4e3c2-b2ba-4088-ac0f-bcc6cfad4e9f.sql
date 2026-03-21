-- Remove the security definer function that is causing the warning
DROP FUNCTION IF EXISTS public.get_public_profile_safe(uuid);

-- Remove any duplicate policies
DROP POLICY IF EXISTS "Public profile view access" ON public.profiles;

-- Clean up and consolidate the profiles policies
-- Keep only the essential, secure policies

-- The final secure policies are:
-- 1. "Users can view their own complete profile" - allows full access to own profile
-- 2. "Friends can view limited profile info" - allows friends to see limited data

-- Note: The profiles_public view remains for potential frontend use but 
-- won't expose sensitive data due to the restrictive RLS policies