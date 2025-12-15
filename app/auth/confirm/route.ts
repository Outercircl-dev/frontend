import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserAuthState, getRedirectUrlForState } from "@/lib/auth-state-machine";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

interface BackendMeResponse {
    id: string;
    supabaseUserId: string;
    email: string;
    hasOnboarded: boolean;
    role: string;
    type?: string;
}

export async function GET(request: NextRequest) {
    const origin = SITE_URL ?? request.nextUrl.origin
    const requestUrl = new URL(request.url)
    const tokenHash = requestUrl.searchParams.get('token_hash');
    const supabase = await createClient();
    
    let accessToken: string | undefined;
    
    // Handle token_hash (OTP verification) - if present, verify OTP
    if (tokenHash) {
        console.log(`token_hash: ${tokenHash}`)
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
        })
        
        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
        }
        
        accessToken = data.session?.access_token;
    } else {
        // No token_hash means session was already set by proxy (from code exchange)
        // Just get the existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            return NextResponse.redirect(new URL('/login?error=no_session', origin))
        }
        
        accessToken = session.access_token;
    }

    // Default redirect destination
    let redirectUrl = new URL('/onboarding/profile', origin)
    const response = NextResponse.redirect(redirectUrl, { status: 302 })
    
    // Call backend /me to get user info and determine redirect (per architect review)
    if (accessToken && API_URL) {
        try {
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

                // Use state machine to determine redirect (consistent with /api/v1/auth/me)
                // Get email verification status from Supabase session
                const { data: { session } } = await supabase.auth.getSession();
                const emailVerified = session?.user?.email_confirmed_at !== null;
                const profileCompleted = userData.hasOnboarded; // Use hasOnboarded from backend
                const authState = getUserAuthState(emailVerified, profileCompleted);
                const redirectPath = getRedirectUrlForState(authState);
                redirectUrl = new URL(redirectPath, origin);
            } else {
                console.error('Backend /me failed in confirm:', backendResponse.status);
                // On backend error, default to onboarding (safe fallback)
            }
        } catch (err) {
            console.error('Error calling backend /me in confirm:', err);
            // On error, default to onboarding (safe fallback)
        }
    } else {
        console.warn('No access token or API_URL, defaulting to onboarding');
    }

    // Update redirect target on the existing response so Supabase-set cookies remain attached
    response.headers.set('Location', redirectUrl.toString())
    return response
}