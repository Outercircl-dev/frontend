import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    console.log(`token_hash: ${tokenHash}`)
    console.log("callback cookies:", request.cookies.getAll().map((c: { name: any; }) => c.name));
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || 'hash',
        type: 'email'
    })
    console.log('User Data: ', data);
    console.log('User Session: ', data.session?.access_token);
    const accessToken = data.session?.access_token
    if (error) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin))
    }
    let redirectUrl = new URL('/onboarding/profile', origin)
    const response = NextResponse.redirect(redirectUrl, { status: 302 })
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
}