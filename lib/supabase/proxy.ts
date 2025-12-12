import { createClient } from "./server";
import { NextRequest, NextResponse } from "next/server";
type ResponseCookie = { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] };

const PROTECTED_ROUTES = ["/feed", "/settings", "/activities", "/profile", "/onboarding"];
const AUTH_ROUTES = ["/login", "/"];
const PUBLIC_ROUTES = ["/auth/callback"];

const API_URL = process.env.NEXT_PUBLIC_API_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')

if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set')
}

interface MeResponse {
    id: string
    supabaseUserId: string
    email: string
    hasOnboarded: boolean
    role: string
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

export async function updateSession(request: NextRequest) {
    const supabaseResponse = NextResponse.next({ request });
    const pendingCookies: ResponseCookie[] = [];

    const supabase = createClient({
        getAll() {
            return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
                supabaseResponse.cookies.set(name, value, options);
                pendingCookies.push({ name, value, options });
            });
        },
    });

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

    // Handle magic link code - redirect to auth/callback if code exists on any route
    const code = searchParams.get('code')
    if (code && pathname !== '/auth/callback') {
        const url = new URL('/auth/callback', origin)
        url.search = request.nextUrl.search
        const redirectResponse = NextResponse.redirect(url)
        pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
        return redirectResponse
    }

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
    if (isPublicRoute) {
        return supabaseResponse
    }

    const isAuthRoute = AUTH_ROUTES.includes(pathname)
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

    if (!hasSession && isProtectedRoute) {
        const url = new URL('/login', origin)
        const redirectResponse = NextResponse.redirect(url)
        pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
        return redirectResponse
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