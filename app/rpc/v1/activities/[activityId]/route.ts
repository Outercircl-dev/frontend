import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

export async function GET(_: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params
  try {
    if (!API_URL) {
      console.error('API_URL is not configured for activity detail fetch')
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}`, {
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
        isJson ? payload : { error: payload || 'Activity fetch failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Activity request timed out' },
        { status: 504 },
      )
    }
    console.error('Error in GET /rpc/v1/activities/[activityId]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params
  try {
    if (!API_URL) {
      console.error('API_URL is not configured for activity update')
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

    const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}`, {
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
        isJson ? payload : { error: payload || 'Activity update failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in PATCH /rpc/v1/activities/[activityId]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params
  try {
    if (!API_URL) {
      console.error('API_URL is not configured for activity delete')
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Backend URL not configured' },
        { status: 500 },
      )
    }

    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        'Content-Type': 'application/json',
      },
    })

    const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await backendResponse.json() : await backendResponse.text()

    if (!backendResponse.ok) {
      return NextResponse.json(
        isJson ? payload : { error: payload || 'Activity delete failed' },
        { status: backendResponse.status || 500 },
      )
    }

    return NextResponse.json(payload, { status: backendResponse.status })
  } catch (error) {
    console.error('Error in DELETE /rpc/v1/activities/[activityId]:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

