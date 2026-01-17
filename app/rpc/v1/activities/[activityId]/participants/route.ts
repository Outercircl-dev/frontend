import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.API_URL

async function proxyToBackend(
  path: string,
  sessionToken: string | null,
  init: (RequestInit & { timeoutMs?: number }) | undefined = { method: 'GET' },
) {
  if (!API_URL) {
    console.error('API_URL is not configured for participant request')
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Backend URL not configured' },
      { status: 500 },
    )
  }

  const controller = new AbortController()
  const { timeoutMs, ...requestInit } = init ?? { method: 'GET' }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? 10_000)

  const backendResponse = await fetch(`${API_URL.replace(/\/+$/, '')}${path}`, {
    ...requestInit,
    headers: {
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      'Content-Type': 'application/json',
      ...(requestInit.headers ?? {}),
    },
    signal: controller.signal,
  })

  clearTimeout(timeoutId)

  const isJson = backendResponse.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await backendResponse.json() : await backendResponse.text()

  if (!backendResponse.ok) {
    return NextResponse.json(
      isJson ? payload : { error: payload || 'Participant request failed' },
      { status: backendResponse.status || 500 },
    )
  }

  return NextResponse.json(payload, { status: backendResponse.status })
}

async function getSessionToken() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await params
    const token = await getSessionToken()
    return await proxyToBackend(`/api/activities/${activityId}/participants`, token, { method: 'GET' })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Participants request timed out' },
        { status: 504 },
      )
    }
    console.error('Error in GET /rpc/v1/activities/[activityId]/participants:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await params
    const token = await getSessionToken()
    const body = await request.json().catch(() => ({}))
    return await proxyToBackend(`/api/activities/${activityId}/participants`, token, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Join request timed out' },
        { status: 504 },
      )
    }
    console.error('Error in POST /rpc/v1/activities/[activityId]/participants:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  try {
    const { activityId } = await params
    const token = await getSessionToken()
    const body = await request.json().catch(() => ({}))
    if (!body?.participantId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'participantId is required to cancel' },
        { status: 400 },
      )
    }

    return await proxyToBackend(
      `/api/activities/${activityId}/participants/${body.participantId}`,
      token,
      {
        method: 'DELETE',
      },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway Timeout', message: 'Cancel request timed out' },
        { status: 504 },
      )
    }
    console.error('Error in DELETE /rpc/v1/activities/[activityId]/participants:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

