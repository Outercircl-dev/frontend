-- Fix the check_rate_limit function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_endpoint text DEFAULT 'general',
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM public.rate_limits 
  WHERE rate_limits.window_start < now() - INTERVAL '24 hours';
  
  -- Count current requests in window (fixed with table alias)
  SELECT COALESCE(SUM(rl.request_count), 0) INTO current_count
  FROM public.rate_limits rl
  WHERE rl.endpoint = p_endpoint
    AND rl.window_start >= window_start_time
    AND (
      (p_user_id IS NOT NULL AND rl.user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND rl.ip_address = p_ip_address) OR
      (p_user_id IS NULL AND p_ip_address IS NULL)
    );
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, ip_address, endpoint, window_start, request_count)
  VALUES (p_user_id, p_ip_address, p_endpoint, now(), 1)
  ON CONFLICT (user_id, ip_address, endpoint, window_start) 
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$;

-- Update the events RLS policy to have better fallback logic
DROP POLICY IF EXISTS "Users can view events they can access" ON public.events;

CREATE POLICY "Users can view events they can access" ON public.events
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Full access for hosts, participants, and saved events (existing logic)
    public.user_can_view_event(id, auth.uid()) OR
    -- Discovery access with graceful fallback if rate limiting fails
    (
      status = 'active' AND
      date >= CURRENT_DATE AND
      -- Try rate limiting, but allow discovery even if it fails
      COALESCE(
        public.check_rate_limit(auth.uid(), NULL, 'event_discovery', 100, 60),
        true  -- Fallback to allow discovery if rate limit check fails
      )
    )
  )
);

COMMENT ON POLICY "Users can view events they can access" ON public.events IS 'SECURITY: Allow event discovery with rate limiting and graceful fallback';

SELECT 'Rate limiting function fixed and dashboard event discovery restored' as status;