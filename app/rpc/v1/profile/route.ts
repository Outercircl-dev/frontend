import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function resolveSessionToken() {
    const supabase = await createClient()
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
        return { token: null, error: NextResponse.json(
            { error: 'Unauthorized', message: 'No valid session found' },
            { status: 401 }
        ) }
    }

    if (!API_URL) {
        console.error('API_URL is not configured for profile route')
        return { token: null, error: NextResponse.json(
            { error: 'Internal Server Error', message: 'Backend URL not configured' },
            { status: 500 }
        ) }
    }

    return { token: session.access_token, error: null }
}

export async function GET() {
    try {
        const { token, error } = await resolveSessionToken()
        if (error || !token) {
            return error
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10_000)

        const backendResponse = await fetch(`${API_URL}/api/profile`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
        const responsePayload = isJson ? await backendResponse.json() : await backendResponse.text()

        if (!backendResponse.ok) {
            const status = backendResponse.status || 500
            const normalizedError = isJson
                ? responsePayload
                : { error: responsePayload || 'Profile fetch failed' }
            return NextResponse.json(normalizedError, { status })
        }

        return NextResponse.json(responsePayload, { status: backendResponse.status })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'Gateway Timeout', message: 'Profile request timed out' },
                { status: 504 }
            )
        }
        console.error('Error in GET /rpc/v1/profile:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { token, error } = await resolveSessionToken()
        if (error || !token) {
            return error
        }

        const body = await request.json()

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10_000)

        const backendResponse = await fetch(`${API_URL}/api/profile`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
        const responsePayload = isJson ? await backendResponse.json() : await backendResponse.text()

        if (!backendResponse.ok) {
            const status = backendResponse.status || 500
            const normalizedError = isJson
                ? responsePayload
                : { error: responsePayload || 'Profile save failed' }
            return NextResponse.json(
                normalizedError,
                { status }
            )
        }

        return NextResponse.json(responsePayload, { status: backendResponse.status })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return NextResponse.json(
                { error: 'Gateway Timeout', message: 'Profile request timed out' },
                { status: 504 }
            )
        }

        console.error('Error in POST /rpc/v1/profile:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

