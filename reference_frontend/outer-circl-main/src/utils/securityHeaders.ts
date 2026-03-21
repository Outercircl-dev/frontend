/**
 * Content Security Policy configuration for production deployment
 * Add these headers to your deployment configuration (Vercel, Netlify, etc.)
 */

export const securityHeaders = {
  // Content Security Policy - Prevents XSS and injection attacks
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 
      https://www.googletagmanager.com 
      https://www.google-analytics.com
      https://pagead2.googlesyndication.com
      https://googleads.g.doubleclick.net;
    style-src 'self' 'unsafe-inline' 
      https://fonts.googleapis.com;
    font-src 'self' 
      https://fonts.gstatic.com;
    img-src 'self' data: blob: 
      https://*.supabase.co 
      
      https://www.googletagmanager.com;
    connect-src 'self' 
      https://*.supabase.co 
      wss://*.supabase.co
      https://www.google-analytics.com;
    media-src 'self' 
      https://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim(),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
  
  // HSTS for HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

// For Vercel deployment - add to vercel.json
export const vercelConfig = {
  "headers": [
    {
      "source": "/(.*)",
      "headers": Object.entries(securityHeaders).map(([key, value]) => ({
        "key": key,
        "value": value
      }))
    }
  ]
};

// For Netlify deployment - add to _headers file
export const netlifyHeaders = `
/*
${Object.entries(securityHeaders)
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}
`;

export default securityHeaders;