-- Retry migration: create optimized rate-limit check and keep wrapper defaults to avoid DROP

-- 1) Helpful index (idempotent)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint_window
ON public.rate_limits (user_id, endpoint, window_start DESC);

-- 2) Add a specialized overloaded function for rate limiting used by profile policies
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

-- 3) Wrapper for profile access checks, preserve parameter defaults to avoid migration error
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(
  p_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.check_rate_limit(p_user_id, p_action, 60, 60);
$$;

-- 4) Ensure execution privileges
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.check_profile_access_rate_limit(uuid, text) TO anon, authenticated;
EXCEPTION WHEN others THEN NULL;
END $$;
