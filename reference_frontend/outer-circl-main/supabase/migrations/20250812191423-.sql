-- Fix ambiguous column reference and improve rate limiting functions used by profile policies

-- 1) Helpful index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_window
ON public.rate_limits (user_id, endpoint, window_start DESC);

-- 2) Core rate limit check function
-- Uses distinct parameter names and fully-qualified column references to avoid ambiguity
-- Read-only (no writes) and SECURITY DEFINER so it can be used safely in RLS policies
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_window_seconds integer DEFAULT 60,
  p_max_requests integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_window_start timestamptz := now() - (p_window_seconds::text || ' seconds')::interval;
  v_request_count integer := 0;
BEGIN
  SELECT COALESCE(SUM(rl.request_count), 0)
  INTO v_request_count
  FROM public.rate_limits AS rl
  WHERE rl.user_id = p_user_id
    AND rl.endpoint = p_endpoint
    AND rl.window_start >= v_window_start;

  RETURN v_request_count < p_max_requests;
END;
$$;

-- 3) Wrapper specifically for profile access actions used in RLS policies
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  p_user_id uuid,
  p_action text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.check_rate_limit(p_user_id, p_action, 60, 60);
$$;

-- 4) Ensure execution privileges (policies run under authenticated users)
DO $$
BEGIN
  -- Grant execute to common roles without exposing table data
  GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.check_profile_access_rate_limit(uuid, text) TO anon, authenticated;
EXCEPTION WHEN others THEN
  -- Avoid failing migration if roles already have permissions
  NULL;
END $$;
