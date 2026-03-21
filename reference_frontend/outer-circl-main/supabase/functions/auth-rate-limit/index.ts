/**
 * Auth Rate Limit Edge Function
 * Provides server-side rate limiting for authentication endpoints
 * Call this before processing login/signup/password-reset attempts
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCorsPreflightResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceededResponse } from "../_shared/rateLimit.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTH-RATE-LIMIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightResponse(req);
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request data
    const { action, email, userId } = await req.json();
    
    if (!action) {
      throw new Error("Action is required (login, signup, password-reset)");
    }

    logStep("Rate limit check", { action, email, userId });

    // Different rate limits for different auth actions
    const rateLimits = {
      'login': { maxRequests: 5, windowMinutes: 15 }, // 5 attempts per 15 min
      'signup': { maxRequests: 3, windowMinutes: 60 }, // 3 signups per hour
      'password-reset': { maxRequests: 3, windowMinutes: 60 }, // 3 resets per hour
    };

    const limit = rateLimits[action as keyof typeof rateLimits];
    if (!limit) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Check rate limit using email or userId as identifier
    const identifier = userId || email;
    const result = await checkRateLimit(supabaseClient, {
      userId: identifier,
      endpoint: `auth-${action}`,
      maxRequests: limit.maxRequests,
      windowMinutes: limit.windowMinutes,
    });

    if (!result.allowed) {
      logStep("Rate limit exceeded", { action, identifier, remaining: result.remaining });
      return rateLimitExceededResponse(result, corsHeaders);
    }

    logStep("Rate limit check passed", { remaining: result.remaining });

    return new Response(
      JSON.stringify({
        success: true,
        allowed: true,
        remaining: result.remaining,
        resetAt: result.resetAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auth-rate-limit", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
