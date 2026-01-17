import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function GET(request: NextRequest) {
  try {
    if (!API_URL) {
      console.error('API_URL is not configured for activities fetch')
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }

    const url = new URL(request.url)
    const backendUrl = new URL(`${API_URL.replace(/\/+$/, '')}/api/activities`)
    backendUrl.search = url.search // forward all query params (page, limit, filters, etc.)

    // Forward auth token if present (activities may be public, but this keeps it flexible)
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

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
    const responsePayload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      const status = backendResponse.status || 500
      const normalizedError = isJson ? responsePayload : { error: responsePayload || 'Activities fetch failed' }
      return NextResponse.json(normalizedError, { status })
    }

    return NextResponse.json(responsePayload, { status: backendResponse.status })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Activities request timed out' },
        { status: 504 },
      )
    }

    console.error('Error in GET /api/activities:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


