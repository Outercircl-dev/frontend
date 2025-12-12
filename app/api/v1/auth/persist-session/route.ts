import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface PersistSessionPayload {
    accessToken?: string
    refreshToken?: string
}

/**
 * POST /api/v1/auth/persist-session
 *
 * Mirrors a client-created Supabase session inside HttpOnly cookies so that
 * server components and API routes can reuse the authenticated context.
 */
export async function POST(request: NextRequest) {
    let payload: PersistSessionPayload

    try {
        payload = await request.json()
    } catch (error) {
        console.error('persist-session: invalid JSON payload', error)
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { accessToken, refreshToken } = payload

    if (!accessToken || !refreshToken) {
        return NextResponse.json(
            { error: 'accessToken and refreshToken are required' },
            { status: 400 }
        )
    }

    const response = NextResponse.json({ ok: true })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    if (error) {
        console.error('persist-session: failed to set Supabase session', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return response
}

