// Copyright (c) 2026 Outer Circle. All rights reserved.

import { createServerClient } from "@supabase/ssr";
import { createClient } from "./server";
import { NextRequest, NextResponse } from "next/server";
import { getUserAuthState } from "../auth-state-machine";
import {
    RETURN_URL_COOKIE,
    RETURN_URL_PARAM,
    buildLoginPath,
    getReturnUrlCookieOptions,
    readReturnUrl,
    resolvePostAuthRedirect,
    sanitizeReturnUrl,
} from "../auth/return-url";
import type { BackendMeResponse } from "../types/auth";
type ResponseCookie = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };
const PROTECTED_ROUTES = ["/feed", "/settings", "/activities", "/profile", "/onboarding"];
const AUTH_ROUTES = ["/login", "/"];
const PUBLIC_ROUTES = ["/auth/confirm"];

const API_URL = process.env.API_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

if (!API_URL) {
    throw new Error('API_URL is not set')
}

function getOrigin(request: NextRequest) {
    if (SITE_URL) return SITE_URL

    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const host = request.headers.get('host')

    if (forwardedHost && forwardedProto) {
        return `${forwardedProto}://${forwardedHost}`
    }

    if (host) {
        const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '')
        return `${protocol}://${host}`
    }

    return request.nextUrl.origin
}

function redirectWithCookies(
    url: URL,
    supabaseResponse: NextResponse,
    pendingCookies: ResponseCookie[],
): NextResponse {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((responseCookie) => {
        redirectResponse.cookies.set(responseCookie);
    });
    pendingCookies.forEach(({ name, value, options }) =>
        redirectResponse.cookies.set(name, value, options),
    );
    return redirectResponse;
}

function redirectToLogin(
    origin: string,
    returnPath: string,
    supabaseResponse: NextResponse,
    pendingCookies: ResponseCookie[],
    errorMessage?: string,
): NextResponse {
    const sanitized = sanitizeReturnUrl(returnPath);
    const loginPath = sanitized ? buildLoginPath(returnPath) : '/login';
    const url = new URL(loginPath, origin);
    if (errorMessage) {
        url.searchParams.set('error', errorMessage);
    }
    const redirectResponse = redirectWithCookies(url, supabaseResponse, pendingCookies);
    if (sanitized) {
        redirectResponse.cookies.set(RETURN_URL_COOKIE, sanitized, getReturnUrlCookieOptions());
    }
    return redirectResponse;
}

function getReturnUrlFromRequest(request: NextRequest): string | null {
    const fromQuery = request.nextUrl.searchParams.get(RETURN_URL_PARAM);
    const fromCookie = request.cookies.get(RETURN_URL_COOKIE)?.value;
    return readReturnUrl(fromQuery, fromCookie);
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })
    const pendingCookies: ResponseCookie[] = [];

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
                },
            },
        }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    // IMPORTANT: If you remove getClaims() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const { data } = await supabase.auth.getClaims()
    // console.log('[PROXY] - Supabase Claims Info:', data)
    const hasSession = Boolean(data?.claims)

    const pathname = request.nextUrl.pathname
    const searchParams = request.nextUrl.searchParams
    const origin = getOrigin(request)

    // Handle magic link code - always exchange code for session in proxy
    // (frontend routes should not talk directly to Supabase)
    const code = searchParams.get('code')
    if (code) {
        // Exchange code for session - this sets cookies via setAll callback
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            const returnPath = `${pathname}${request.nextUrl.search}`;
            return redirectToLogin(origin, returnPath, supabaseResponse, pendingCookies, error.message);
        }

        // Code exchanged successfully — redirect to /auth/confirm (allowlisted path only).
        // returnUrl is read from oc_return_url cookie; Supabase strips query params.
        const url = new URL('/auth/confirm', origin)
        const redirectResponse = redirectWithCookies(url, supabaseResponse, pendingCookies)
        const returnUrl = getReturnUrlFromRequest(request)
        if (returnUrl) {
            redirectResponse.cookies.set(RETURN_URL_COOKIE, returnUrl, getReturnUrlCookieOptions())
        }
        return redirectResponse
    }

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
    if (isPublicRoute) {
        return supabaseResponse
    }

    const isAuthRoute = AUTH_ROUTES.includes(pathname)
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

    // If user has session and tries to access auth routes, redirect them to appropriate protected route
    // BUT: Skip redirect if we're already on /login with an error (prevents infinite loop when backend fails)
    const hasErrorParam = searchParams.has('error')
    if (hasSession && isAuthRoute && !(pathname === '/login' && hasErrorParam)) {
        // Call backend /me to determine where user should go
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            const accessToken = currentSession?.access_token

            if (accessToken) {
                console.log(`Access Token: ${accessToken}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for middleware

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
                    const userData: BackendMeResponse = await backendResponse.json()
                    // Use state machine to determine redirect (consistent with /rpc/v1/auth/me)
                    // Check email verification status from Supabase user; treat undefined as not verified
                    const user = currentSession?.user
                    const emailVerified = Boolean(user && user.email_confirmed_at !== null)
                    const profileCompleted = userData.hasOnboarded
                    const authState = getUserAuthState(emailVerified, profileCompleted)
                    const returnUrl = getReturnUrlFromRequest(request)
                    const redirectPath = resolvePostAuthRedirect({ authState, returnUrl })
                    const url = new URL(redirectPath, origin)
                    const redirectResponse = redirectWithCookies(url, supabaseResponse, pendingCookies)
                    redirectResponse.cookies.delete(RETURN_URL_COOKIE)
                    return redirectResponse
                } else {
                    // Backend /me failed - redirect to login with error message
                    const errorMessage = backendResponse.status === 401
                        ? 'Authentication failed'
                        : 'Service unavailable';
                    const returnPath = `${pathname}${request.nextUrl.search}`;
                    return redirectToLogin(origin, returnPath, supabaseResponse, pendingCookies, errorMessage);
                }
            } else {
                const returnPath = `${pathname}${request.nextUrl.search}`;
                return redirectToLogin(origin, returnPath, supabaseResponse, pendingCookies, 'Configuration error');
            }
        } catch (err) {
            const errorMessage = err instanceof Error && err.name === 'AbortError'
                ? 'Request timeout'
                : 'Service unavailable';
            const returnPath = `${pathname}${request.nextUrl.search}`;
            return redirectToLogin(origin, returnPath, supabaseResponse, pendingCookies, errorMessage);
        }
    }

    if (!hasSession && isProtectedRoute) {
        const returnPath = `${pathname}${request.nextUrl.search}`;
        return redirectToLogin(origin, returnPath, supabaseResponse, pendingCookies);
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!
    return supabaseResponse
}