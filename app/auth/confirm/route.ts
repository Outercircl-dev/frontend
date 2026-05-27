// Copyright (c) 2026 Outer Circle. All rights reserved.

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserAuthState } from "@/lib/auth-state-machine";
import {
    RETURN_URL_COOKIE,
    RETURN_URL_PARAM,
    appendReturnUrl,
    buildLoginPath,
    readReturnUrl,
    resolvePostAuthRedirect,
} from "@/lib/auth/return-url";
import type { BackendMeResponse } from "@/lib/types/auth";
import type { Session } from "@supabase/supabase-js";

const API_URL = process.env.API_URL;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

function getReturnUrl(request: NextRequest): string | null {
    const fromQuery = request.nextUrl.searchParams.get(RETURN_URL_PARAM);
    const fromCookie = request.cookies.get(RETURN_URL_COOKIE)?.value;
    return readReturnUrl(fromQuery, fromCookie);
}

function redirectToLoginWithReturn(
    origin: string,
    returnUrl: string | null,
    errorMessage: string,
): NextResponse {
    const loginPath = returnUrl ? buildLoginPath(returnUrl) : '/login';
    const url = new URL(loginPath, origin);
    url.searchParams.set('error', errorMessage);
    return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
    const origin = SITE_URL ?? request.nextUrl.origin
    const requestUrl = new URL(request.url)
    const returnUrl = getReturnUrl(request);
    const tokenHash = requestUrl.searchParams.get('token_hash');
    const code = requestUrl.searchParams.get('code');
    const errorCode = requestUrl.searchParams.get('error_code');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const supabase = await createClient();

    let accessToken: string | undefined;
    let session: Session | undefined;
    const { data: currentSessionData } = await supabase.auth.getSession();

    // Handle token_hash (OTP verification) - if present, verify OTP
    if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
        })

        if (error) {
            return redirectToLoginWithReturn(origin, returnUrl, error.message);
        }

        accessToken = data.session?.access_token;
        session = data.session ?? undefined;
    } else {
        // Proxy-based flow: code was already exchanged in middleware, so /auth/confirm
        // may be called without token_hash but with a valid session cookie.
        if (currentSessionData.session?.access_token) {
            accessToken = currentSessionData.session.access_token;
            session = currentSessionData.session;
        } else {
            // No token_hash and no session means real auth failure.
            return redirectToLoginWithReturn(origin, returnUrl, 'Authentication Unsuccessful');
        }
    }

    let redirectPath = appendReturnUrl('/onboarding/profile', returnUrl)

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

                // Use state machine to determine redirect (consistent with /rpc/v1/auth/me)
                // Get email verification status from the existing Supabase session
                const emailVerified = session?.user?.email_confirmed_at !== null;
                const profileCompleted = userData.hasOnboarded; // Use hasOnboarded from backend
                const authState = getUserAuthState(emailVerified, profileCompleted);
                redirectPath = resolvePostAuthRedirect({ authState, returnUrl });
            } else {
                // Backend /me failed
                if (backendResponse.status === 401) {
                    return redirectToLoginWithReturn(origin, returnUrl, 'Authentication failed');
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
        return redirectToLoginWithReturn(origin, returnUrl, errorMsg.replace(/\+/g, ' '));
    }

    const redirectUrl = new URL(redirectPath, origin);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(RETURN_URL_COOKIE);
    return response;
}