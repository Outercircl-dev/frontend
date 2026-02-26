import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username') ?? ''
    if (!username.trim()) {
      return NextResponse.json(
        { message: 'Username is required', details: [{ field: 'username', message: 'Username is required' }] },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No valid session found' },
        { status: 401 }
      )
    }

    if (!API_URL) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 }
      )
    }

    const backendResponse = await fetch(
      `${API_URL}/api/profile/username-availability?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const responsePayload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? responsePayload : { error: responsePayload || 'Username check failed' },
        { status: backendResponse.status || 500 }
      )
    }

    return NextResponse.json(responsePayload, { status: 200 })
  } catch (error) {
    console.error('Error in GET /rpc/v1/profile/username-availability:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
