import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function forward(path: string, request: NextRequest) {
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
  const backendUrl = new URL(`${API_URL.replace(/\/+$/, '')}${path}`)
  backendUrl.search = url.search

  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      'Content-Type': 'application/json',
    },
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    return NextResponse.json(
      isJson ? payload : { error: payload || 'Notifications request failed' },
      { status: response.status || 500 },
    )
  }
  return NextResponse.json(payload, { status: response.status })
}

export async function GET(request: NextRequest) {
  try {
    return await forward('/api/notifications', request)
  } catch (error) {
    console.error('Error in GET /rpc/v1/notifications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

