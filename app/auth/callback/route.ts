import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

/**
 * Backend /me response shape
 */
interface BackendMeResponse {
  id: string;
  supabaseUserId: string;
  email: string;
  hasOnboarded: boolean;
  role: string;
  type?: string;
}

/**
 * GET /auth/callback
 * 
 * Handles magic link callback after user clicks email link.
 * 
 * Flow:
 * 1. Exchange code for session (Supabase)
 * 2. Get access token from session
 * 3. Call backend /me to get user info (per architect: no direct DB queries)
 * 4. Determine redirect based on hasOnboarded
 * 5. Set cookies and redirect
 */
export async function GET(request: NextRequest) {
  const origin = SITE_URL || request.nextUrl.origin
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin))
  }

  // Default redirect destination
  let redirectUrl = new URL('/onboarding/profile', origin)

  // Create temporary response to capture cookies during session exchange
  const tempResponse = NextResponse.next()

  // Create Supabase client that sets cookies on tempResponse
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            tempResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange the code for a session
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
  }

  // Get access token from session
  const accessToken = data.session?.access_token
  console.log('############## Session Token ##############', accessToken)

  if (accessToken && API_URL) {
    try {
      // Call backend /me to get user info (per architect review)
      const backendResponse = await fetch(`${API_URL}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (backendResponse.ok) {
        const userData: BackendMeResponse = await backendResponse.json();
        console.log('########## BE Response #################', userData)

        // Determine redirect based on hasOnboarded from backend
        if (userData.hasOnboarded) {
          redirectUrl = new URL('/feed', origin)
        }
        // else: stay with default /onboarding/profile
      } else {
        console.error('Backend /me failed in callback:', backendResponse.status);
        // On backend error, default to onboarding (safe fallback)
      }
    } catch (err) {
      console.error('Error calling backend /me in callback:', err);
      // On error, default to onboarding (safe fallback)
    }
  } else {
    console.warn('No access token or API_URL, defaulting to onboarding');
  }

  // Create final redirect response and copy session cookies to it
  // IMPORTANT: Preserve original cookie options from Supabase SSR
  // DO NOT set httpOnly: true - the browser client needs to read these cookies
  const finalResponse = NextResponse.redirect(redirectUrl)

  tempResponse.cookies.getAll().forEach((cookie) => {
    // Copy cookie with its original options (not overriding with httpOnly)
    finalResponse.cookies.set(cookie.name, cookie.value, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })
  })

  return finalResponse
}
