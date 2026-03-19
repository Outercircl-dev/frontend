import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function POST(request: NextRequest) {
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

    const backendResponse = await fetch(
      `${API_URL.replace(/\/+$/, '')}/api/uploads/profile-avatar/presign`,
      {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
      },
    )

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Failed to generate avatar upload URL' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in POST /rpc/v1/uploads/profile-avatar/presign', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
