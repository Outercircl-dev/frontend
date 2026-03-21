import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// EU country codes (ISO 3166-1 alpha-2)
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
]

// Allowed countries: US, UK, and all EU countries
const ALLOWED_COUNTRIES = ['US', 'GB', ...EU_COUNTRIES]

interface GeolocationResponse {
  country_code: string
  country_name: string
  ip: string
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the client IP address
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    console.log(`Checking geolocation for IP: ${clientIP}`)

    // If IP is unknown or localhost, allow access (for development)
    if (clientIP === 'unknown' || clientIP.includes('127.0.0.1') || clientIP.includes('localhost')) {
      return new Response(
        JSON.stringify({
          allowed: true,
          country_code: 'UNKNOWN',
          country_name: 'Development Environment',
          ip: clientIP,
          reason: 'Development environment detected'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Get geolocation data from ipapi.co
    const geoResponse = await fetch(`https://ipapi.co/${clientIP}/json/`)
    
    if (!geoResponse.ok) {
      throw new Error(`Geolocation API error: ${geoResponse.status}`)
    }

    const geoData: GeolocationResponse = await geoResponse.json()

    console.log(`Geolocation data:`, geoData)

    // Check if there's an error in the response
    if (geoData.error) {
      console.error('Geolocation API error:', geoData.error)
      // In case of API error, allow access but log the issue
      return new Response(
        JSON.stringify({
          allowed: true,
          country_code: 'UNKNOWN',
          country_name: 'Unknown (API Error)',
          ip: clientIP,
          reason: 'Geolocation API error - allowing access'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check if the country is allowed
    const isAllowed = ALLOWED_COUNTRIES.includes(geoData.country_code)

    console.log(`Country ${geoData.country_code} (${geoData.country_name}) - Allowed: ${isAllowed}`)

    // Log blocked access attempts for security monitoring
    if (!isAllowed) {
      console.warn(`Blocked access from ${geoData.country_code} (${geoData.country_name}) - IP: ${clientIP}`)
    }

    return new Response(
      JSON.stringify({
        allowed: isAllowed,
        country_code: geoData.country_code,
        country_name: geoData.country_name,
        ip: clientIP,
        reason: isAllowed 
          ? 'Access granted - country is allowed' 
          : 'Access denied - country not in allowed list (US, UK, EU)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Geolocation check error:', error)

    // In case of any error, allow access but log the issue
    return new Response(
      JSON.stringify({
        allowed: true,
        country_code: 'ERROR',
        country_name: 'Error checking location',
        ip: 'unknown',
        reason: 'Error occurred during geolocation check - allowing access',
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})