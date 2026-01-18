import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function getSessionToken() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string; messageId: string }> },
) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }

    const { activityId, messageId } = await params
    const token = await getSessionToken()
    const body = await request.json().catch(() => ({}))

    const backendResponse = await fetch(
      `${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}/messages/${messageId}/report`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      },
    )

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Report failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in POST /rpc/v1/activities/[activityId]/messages/[messageId]/report:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

