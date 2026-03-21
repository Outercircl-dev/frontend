-- Secure public profiles: enable RLS and enforce privacy-aware SELECT only

-- 1) Enable Row Level Security on profiles_public
ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

-- 2) Clean up any previous permissive policies if they exist (idempotent drops)
DROP POLICY IF EXISTS "profiles_public_privacy_enforced_select" ON public.profiles_public;
DROP POLICY IF EXISTS "profiles_public_admin_select" ON public.profiles_public;

-- 3) Privacy-enforced SELECT for authenticated users only, with rate limiting and self-access
CREATE POLICY "profiles_public_privacy_enforced_select"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (
  public.check_profile_access_rate_limit(auth.uid(), 'profile_view')
  AND public.can_view_profile(id, auth.uid())
);

-- 4) Admin bypass policy to allow full access for admins
CREATE POLICY "profiles_public_admin_select"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Note: No INSERT/UPDATE/DELETE policies are created; with RLS enabled, those operations are denied by default,
-- preventing clients from modifying this table and reducing exposure risk.
