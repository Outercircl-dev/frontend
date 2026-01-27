import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function getSessionToken() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string; profileId: string }> },
) {
  try {
    const { activityId, profileId } = await params
    const token = await getSessionToken()

    if (!API_URL) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }

    const response = await fetch(
      `${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}/feedback/ratings/${profileId}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
      },
    )

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Rating request failed' },
        { status: response.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('Error in GET /rpc/v1/activities/[activityId]/feedback/ratings/[profileId]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

