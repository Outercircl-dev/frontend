import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRedirectUrlForState, getUserAuthState } from '@/lib/auth-state-machine';
import { BackendMeResponse, SubscriptionTier } from '@/lib/types/auth';

const API_URL = process.env.API_URL;

/**
 * Response shape for frontend consumption
 */
interface AuthMeResponse {
  state: string;
  redirectUrl: string | null;
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
 * GET /rpc/v1/auth/me
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
    // 1. Get Supabase client (uses request cookies)
    const supabase = await createClient();

    // 2. Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session' },
        { status: 401 }
      );
    }

    const accessToken = session.access_token;
    const user = session.user;

    // 3. Get email_verified from Supabase user
    // Supabase stores this in user metadata when email is confirmed
    const emailVerified = user.email_confirmed_at !== null;

    // 4. Call backend /me endpoint with Bearer token
    if (!API_URL) {
      console.error('API_URL is not configured');
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const backendResponse = await fetch(`${API_URL}/api/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend /me error:', backendResponse.status, errorText);

      if (backendResponse.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Backend authentication failed' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend request failed' },
        { status: 500 }
      );
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
        type: backendData.type ?? SubscriptionTier.FREEMIUM, // Handle potential undefined from backend
      },
      profile: {
        emailVerified,
        profileCompleted,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in GET /rpc/v1/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
