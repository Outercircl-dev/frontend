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
            const url = new URL('/login', origin);
            url.searchParams.set('error', error.message);
            return NextResponse.redirect(url);
        }
        
        accessToken = data.session?.access_token;
        session = data.session ?? undefined;
    } else {
        // No token_hash - this should not happen in normal flow
        // Redirect to login with authentication error
        const url = new URL('/login', origin);
        url.searchParams.set('error', 'Authentication Unsuccessful');
        return NextResponse.redirect(url);
    }

    // Default redirect destination path
    let redirectPath = '/onboarding/profile'

    // Call backend /me to get user info and determine redirect (per architect review)
    if (accessToken && API_URL) {
        try {
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

            if (backendResponse.ok) {
                const userData: BackendMeResponse = await backendResponse.json();

                // Use state machine to determine redirect (consistent with /api/v1/auth/me)
                // Get email verification status from the existing Supabase session
                const emailVerified = session?.user?.email_confirmed_at !== null;
                const profileCompleted = userData.hasOnboarded; // Use hasOnboarded from backend
                const authState = getUserAuthState(emailVerified, profileCompleted);
                redirectPath = getRedirectUrlForState(authState);
            } else {
                // Backend /me failed
                if (backendResponse.status === 401) {
                    // Authentication failed - token invalid, redirect to login
                    const url = new URL('/login', origin);
                    url.searchParams.set('error', 'Authentication failed');
                    return NextResponse.redirect(url);
                } else {
                    // Service error (500, 503, etc.) - for new users completing magic link,
                    // allow onboarding as fallback (backend might be temporarily down)
                    // Note: Proxy still enforces strict error handling for authenticated users
                    console.warn('Backend /me failed in auth/confirm, defaulting to onboarding:', backendResponse.status);
                    // Keep default redirectPath = '/onboarding/profile'
                }
            }
        } catch (err) {
            // Network/timeout error - for new users, default to onboarding as fallback
            // (Backend might be temporarily unavailable, but user should be able to try onboarding)
            console.warn('Error calling backend /me in auth/confirm, defaulting to onboarding:', err);
            // Keep default redirectPath = '/onboarding/profile'
        }
    } else {
        // Missing access token or API_URL - redirect to login with error
        // Distinguish between auth failure (missing accessToken) vs config error (missing API_URL)
        const errorMsg = !accessToken
            ? 'Authentication+failed'
            : 'Configuration+error';
        const url = new URL('/login', origin);
        url.searchParams.set('error', errorMsg);
        return NextResponse.redirect(url);
    }

    // Create redirect response with computed path
    // Supabase cookies are already set via createClient() server function's cookie handling
    const redirectUrl = new URL(redirectPath, origin);
    return NextResponse.redirect(redirectUrl);
}