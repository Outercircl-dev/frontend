/**
 * Server-Side Rate Limiting for Edge Functions
 * Uses Supabase database for distributed rate limiting
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface RateLimitOptions {
  userId?: string;
  endpoint: string;
  maxRequests: number;
  windowMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Check rate limit for a given endpoint and user
 * Uses the check_rate_limit_sensitive database function
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { userId, endpoint, maxRequests, windowMinutes = 60 } = options;

  try {
    // Call the database rate limit function
    const { data, error } = await supabase.rpc('check_rate_limit_sensitive', {
      p_user_id: userId || null,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: new Date(Date.now() + windowMinutes * 60000),
      };
    }

    // Rate limit exceeded
    if (!data) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + windowMinutes * 60000),
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minutes.`,
      };
    }

    // Calculate remaining requests
    // The function returns true if allowed, but we need to query current count
    const { data: currentLimit } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('endpoint', endpoint)
      .eq('user_id', userId || null)
      .gte('window_start', new Date(Date.now() - windowMinutes * 60000).toISOString())
      .maybeSingle();

    const currentCount = currentLimit?.request_count || 0;
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      allowed: true,
      remaining,
      resetAt: new Date(Date.now() + windowMinutes * 60000),
    };
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Fail open on error
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowMinutes * 60000),
    };
  }
}

/**
 * Returns a 429 Too Many Requests response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: HeadersInit
): Response {
  return new Response(
    JSON.stringify({
      error: result.message || 'Rate limit exceeded',
      resetAt: result.resetAt.toISOString(),
      remaining: result.remaining,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
      },
    }
  );
}
