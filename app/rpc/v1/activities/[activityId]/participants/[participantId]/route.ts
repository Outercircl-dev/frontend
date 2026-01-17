import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ activityId: string; participantId: string }> },
) {
    const { activityId, participantId } = await params
    try {
        if (!API_URL) {
            console.error('API_URL is not configured for participant moderation')
            return NextResponse.json(
                { error: 'Internal Server Error', message: 'Backend URL not configured' },
                { status: 500 },
            )
        }

        const supabase = await createClient()
        const {
            data: { session },
        } = await supabase.auth.getSession()

        const body = await request.json().catch(() => ({}))

        const response = await fetch(
            `${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}/participants/${participantId}`,
            {
                method: 'PATCH',
                headers: {
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body ?? {}),
            },
        )

        const isJson = response.headers.get('content-type')?.includes('application/json')
        const payload = isJson ? await response.json() : await response.text()

        if (!response.ok) {
            return NextResponse.json(
                isJson ? payload : { error: payload || 'Moderation request failed' },
                { status: response.status || 500 },
            )
        }

        return NextResponse.json(payload, { status: response.status })
    } catch (error) {
        console.error('Error in PATCH /rpc/v1/activities/[activityId]/participants/[participantId]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

