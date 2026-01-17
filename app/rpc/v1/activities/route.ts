import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function forwardRequest(path: string, request: NextRequest) {
  if (!API_URL) {
    console.error('API_URL is not configured for activities fetch')
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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  const backendResponse = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await backendResponse.json() : await backendResponse.text()

  if (!backendResponse.ok) {
    return NextResponse.json(
      isJson ? payload : { error: payload || 'Activities fetch failed' },
      { status: backendResponse.status || 500 },
    )
  }

  return NextResponse.json(payload, { status: backendResponse.status })
}

export async function GET(request: NextRequest) {
  try {
    return await forwardRequest('/api/activities', request)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Activities request timed out' },
        { status: 504 },
      )
    }
    console.error('Error in GET /rpc/v1/activities:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!API_URL) {
      console.error('API_URL is not configured for activities create')
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

    const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/api/activities`, {
      method: 'POST',
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
        isJson ? payload : { error: payload || 'Activity creation failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in POST /rpc/v1/activities:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

