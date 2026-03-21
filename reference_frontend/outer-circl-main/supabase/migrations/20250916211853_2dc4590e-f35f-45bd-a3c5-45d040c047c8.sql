-- Update the profiles_public_secure RLS policy to work with the new can_view_profile function
DROP POLICY IF EXISTS "profiles_public_secure_authenticated_only" ON public.profiles_public_secure;

CREATE POLICY "profiles_public_secure_authenticated_access" 
ON public.profiles_public_secure 
FOR SELECT 
USING (
  -- Must be authenticated to view any profile
  auth.uid() IS NOT NULL AND (
    -- Users can always view their own profile
    auth.uid() = id
    OR 
    -- Allow viewing based on can_view_profile function (returns 'full', 'limited', or 'none')
    can_view_profile(id, auth.uid()) != 'none'
  )
);