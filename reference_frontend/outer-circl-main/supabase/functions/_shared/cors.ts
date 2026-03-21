/**
 * CORS Configuration for Edge Functions
 * Uses allowlist approach instead of wildcard for security
 */

// Allowed origins - add your production domain(s) here
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bommnpdpzmvqufurwwik.supabase.co',
  'https://outercircl.lovable.app',
  // Add your custom domain when you have one
];

/**
 * Get CORS headers for a specific request
 * Validates origin against allowlist
 */
export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  
  // Check if origin is in allowlist
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Default to localhost for development

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
