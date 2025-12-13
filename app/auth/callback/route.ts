import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
  const origin = SITE_URL ?? request.nextUrl.origin
  const origin = SITE_URL ?? request.nextUrl.origin
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  console.log("callback cookies:", request.cookies.getAll().map((c: { name: any; }) => c.name));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin))
  }

  // Default redirect destination and response used for cookie writes
  // Default redirect destination and response used for cookie writes
  let redirectUrl = new URL('/onboarding/profile', origin)
  const response = NextResponse.redirect(redirectUrl, { status: 302 })
  const response = NextResponse.redirect(redirectUrl, { status: 302 })

  // Create Supabase client bound to the current request/response cookies
  const supabase = await createClient()

  // Exchange the code for a session
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
  }

  // Get access token from session
  const accessToken = data.session?.access_token

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

  // Update redirect target on the existing response so Supabase-set cookies remain attached
  response.headers.set('Location', redirectUrl.toString())
  return response
  // Update redirect target on the existing response so Supabase-set cookies remain attached
  response.headers.set('Location', redirectUrl.toString())
  return response
}
