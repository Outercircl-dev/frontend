import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseCookie } from '@/lib/supabase/server';
import { getRedirectUrlForState, getUserAuthState } from '@/lib/auth-state-machine';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Subscription tier enum - matches backend SubscriptionTier
 */
export enum SubscriptionTier {
  FREEMIUM = 'FREEMIUM',
  PREMIUM = 'PREMIUM',
}

/**
 * Backend /me response shape
 */
interface BackendMeResponse {
  id: string;
  supabaseUserId: string;
  email: string;
  hasOnboarded: boolean;
  role: string;
  type: SubscriptionTier;
}

/**
 * Response shape for frontend consumption
 */
interface AuthMeResponse {
  state: string;
  redirectUrl: string;
  user: {
    id: string;
    email: string;
    supabaseUserId: string;
    type: SubscriptionTier;
  };
  profile: {
    emailVerified: boolean;
    profileCompleted: boolean;
  };
}

/**
 * GET /api/v1/auth/me
 * 
 * Proxies to NestJS backend /me endpoint.
 * 
 * Architecture:
 * 1. Get Supabase session from cookies
 * 2. Extract access token
 * 3. Call backend /me with Bearer token
 * 4. Map backend response to frontend auth state
 * 
 * Note: emailVerified comes from Supabase user metadata,
 * hasOnboarded (profileCompleted) comes from backend.
 */
export async function GET(request: NextRequest) {
  try {
    const responseCookies: SupabaseCookie[] = [];
    const attachCookies = (response: NextResponse) => {
      responseCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      return response;
    };

    // 1. Get Supabase client (uses request cookies)
    const supabase = createClient({
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => responseCookies.push(cookie));
      },
    });

    // 2. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return attachCookies(NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      ));
    }

    const accessToken = session.access_token;
    const user = session.user;

    // 3. Get email_verified from Supabase user
    // Supabase stores this in user metadata when email is confirmed
    const emailVerified = user.email_confirmed_at !== null;

    // 4. Call backend /me endpoint with Bearer token
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured');
      return attachCookies(NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      ));
    }

    const backendResponse = await fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /me error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return attachCookies(NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        ));
      }

      return attachCookies(NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend request failed' },
        { status: 500 }
      ));
    }

    const backendData: BackendMeResponse = await backendResponse.json();

    // 5. Map backend hasOnboarded to our profileCompleted
    const profileCompleted = backendData.hasOnboarded;

    // 6. Determine auth state using state machine
    const state = getUserAuthState(emailVerified, profileCompleted);
    const redirectUrl = getRedirectUrlForState(state);

    // 7. Build response
    const response: AuthMeResponse = {
      state,
      redirectUrl,
      user: {
        id: backendData.id,
        email: backendData.email,
        supabaseUserId: backendData.supabaseUserId,
        type: backendData.type ?? SubscriptionTier.FREEMIUM,
      },
      profile: {
        emailVerified,
        profileCompleted,
      },
    };

    return attachCookies(NextResponse.json(response, { status: 200 }));

  } catch (error) {
    console.error('Error in GET /api/v1/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
