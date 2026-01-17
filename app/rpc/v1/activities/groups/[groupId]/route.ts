import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params
  try {
    if (!API_URL) {
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

    const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/api/activities/groups/${groupId}`, {
      method: 'PATCH',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    })

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Group update failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in PATCH /rpc/v1/activities/groups/[groupId]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

