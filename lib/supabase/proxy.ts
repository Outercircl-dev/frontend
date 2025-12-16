import { createServerClient } from "@supabase/ssr";
import { createClient } from "./server";
import { NextRequest, NextResponse } from "next/server";
import { getUserAuthState, getRedirectUrlForState } from "../auth-state-machine";
import type { BackendMeResponse } from "../types/auth";
type ResponseCookie = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };
const PROTECTED_ROUTES = ["/feed", "/settings", "/activities", "/profile", "/onboarding"];
const AUTH_ROUTES = ["/login", "/"];
const PUBLIC_ROUTES = ["/auth/confirm"];

const API_URL = process.env.NEXT_PUBLIC_API_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set')
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
    console.log('[PROXY] - Supabase Claims Info:', data)
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
            // On error, redirect to login with error message
            const url = new URL('/login', origin)
            url.searchParams.set('error', encodeURIComponent(error.message))
            return redirectWithCookies(url, supabaseResponse, pendingCookies)
        }

        // Code exchanged successfully, session cookies are set via setAll callback
        // Now redirect to /auth/confirm which will handle backend /me call and final redirect
        const url = new URL('/auth/confirm', origin)
        // Preserve any other query params (like type, etc.) but remove code since it's been used
        searchParams.delete('code')
        url.search = searchParams.toString()
        return redirectWithCookies(url, supabaseResponse, pendingCookies)
    }

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
    if (isPublicRoute) {
        return supabaseResponse
    }

    const isAuthRoute = AUTH_ROUTES.includes(pathname)
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

    // If user has session and tries to access auth routes, redirect them to appropriate protected route
    if (hasSession && isAuthRoute) {
        // Call backend /me to determine where user should go
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            const accessToken = currentSession?.access_token
            
            if (accessToken) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for middleware

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
                    const userData: BackendMeResponse = await backendResponse.json()
                    // Use state machine to determine redirect (consistent with /api/v1/auth/me)
                    // Check email verification status from Supabase user; treat undefined as not verified
                    const user = currentSession?.user
                    const emailVerified = Boolean(user && user.email_confirmed_at != null)
                    const profileCompleted = userData.hasOnboarded
                    const authState = getUserAuthState(emailVerified, profileCompleted)
                    const redirectPath = getRedirectUrlForState(authState)
                    const url = new URL(redirectPath, origin)
                    return redirectWithCookies(url, supabaseResponse, pendingCookies)
                } else {
                    // Backend call failed but user has session - default to onboarding as safe fallback
                    console.warn('Backend /me failed in proxy, defaulting to onboarding:', backendResponse.status)
                    const url = new URL('/onboarding/profile', origin)
                    return redirectWithCookies(url, supabaseResponse, pendingCookies)
                }
            } else {
                // Has session but no access token - redirect to onboarding as safe fallback
                const url = new URL('/onboarding/profile', origin)
                return redirectWithCookies(url, supabaseResponse, pendingCookies)
            }
        } catch (err) {
            console.error('Error checking user state in proxy:', err)
            // Backend error but user has session - default to onboarding as safe fallback
            const url = new URL('/onboarding/profile', origin)
            return redirectWithCookies(url, supabaseResponse, pendingCookies)
        }
    }

    if (!hasSession && isProtectedRoute) {
        const url = new URL('/login', origin)
        return redirectWithCookies(url, supabaseResponse, pendingCookies)
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