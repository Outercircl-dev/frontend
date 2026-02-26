import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function POST() {
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

    const response = await fetch(`${API_URL.replace(/\/+$/, '')}/api/notifications/read-all`, {
      method: 'POST',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        'Content-Type': 'application/json',
      },
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()
    if (!response.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Read-all request failed' },
        { status: response.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('Error in POST /rpc/v1/notifications/read-all:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

