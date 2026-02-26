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

export async function GET() {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }
    const token = await getSessionToken()
    const response = await fetch(`${API_URL.replace(/\/+$/, '')}/api/notifications/preferences`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    })
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()
    if (!response.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Preferences request failed' },
        { status: response.status || 500 },
      )
    }
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('Error in GET /rpc/v1/notifications/preferences:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }
    const token = await getSessionToken()
    const body = await request.json().catch(() => ({}))
    const response = await fetch(`${API_URL.replace(/\/+$/, '')}/api/notifications/preferences`, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    })
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()
    if (!response.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Preferences update failed' },
        { status: response.status || 500 },
      )
    }
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error('Error in PUT /rpc/v1/notifications/preferences:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

