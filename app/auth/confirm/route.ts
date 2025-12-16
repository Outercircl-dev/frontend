import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserAuthState, getRedirectUrlForState } from "@/lib/auth-state-machine";
import type { BackendMeResponse } from "@/lib/types/auth";
import type { Session } from "@supabase/supabase-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

export async function GET(request: NextRequest) {
    const origin = SITE_URL ?? request.nextUrl.origin
    const requestUrl = new URL(request.url)
    const tokenHash = requestUrl.searchParams.get('token_hash');
    const supabase = await createClient();
    
    let accessToken: string | undefined;
    let session: Session | undefined;
    
    // Handle token_hash (OTP verification) - if present, verify OTP
    if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
        })
        
        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
        }
        
        accessToken = data.session?.access_token;
        session = data.session;
    } else {
        // No token_hash means session was already set by proxy (from code exchange)
        // Just get the existing session
        const result = await supabase.auth.getSession();
        const currentSession = result.data.session;
        const sessionError = result.error;
        
        if (sessionError || !currentSession) {
            return NextResponse.redirect(new URL('/login?error=no_session', origin))
        }
        
        accessToken = currentSession.access_token;
        session = currentSession;
    }

    // Default redirect destination path
    let redirectPath = '/onboarding/profile'

    // Call backend /me to get user info and determine redirect (per architect review)
    if (accessToken && API_URL) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const backendResponse = await fetch(`${API_URL}/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (backendResponse.ok) {
                const userData: BackendMeResponse = await backendResponse.json();

                // Use state machine to determine redirect (consistent with /api/v1/auth/me)
                // Get email verification status from the existing Supabase session
                const emailVerified = session?.user?.email_confirmed_at != null;
                const profileCompleted = userData.hasOnboarded; // Use hasOnboarded from backend
                const authState = getUserAuthState(emailVerified, profileCompleted);
                redirectPath = getRedirectUrlForState(authState);
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

    // Create redirect response with computed path
    // Supabase cookies are already set via createClient() server function's cookie handling
    const redirectUrl = new URL(redirectPath, origin);
    return NextResponse.redirect(redirectUrl);
}