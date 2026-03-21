-- Drop the restrictive profile select policy
DROP POLICY IF EXISTS "profiles_select_own_only" ON public.profiles;

-- Create a new policy that allows viewing profiles based on the can_view_profile function
CREATE POLICY "profiles_select_with_permission" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR 
  -- Users can view other profiles if the can_view_profile function allows it
  (
    auth.uid() IS NOT NULL 
    AND can_view_profile(id, auth.uid())
  )
);