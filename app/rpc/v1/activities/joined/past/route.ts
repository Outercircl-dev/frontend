import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url)
    const backendUrl = new URL(`${API_URL.replace(/\/+$/, '')}/api/activities/joined/past`)
    backendUrl.search = url.search

    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        'Content-Type': 'application/json',
      },
    })

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Failed to load past activities' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in GET /rpc/v1/activities/joined/past', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
