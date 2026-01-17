'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Activity } from '@/lib/types/activity'

interface JoinOptions {
  message?: string
  inviteCode?: string
}

interface ParticipationResponse {
  activity: Activity
}

export function useParticipation(activityId: string) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/rpc/v1/activities/${activityId}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to load activity (${res.status})`)
      }
      const data = (await res.json()) as Activity
      setActivity(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading activity')
      setActivity(null)
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  const join = useCallback(
    async (options?: JoinOptions) => {
      const res = await fetch(`/rpc/v1/activities/${activityId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options ?? {}),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to join activity (${res.status})`)
      }

      const data = (await res.json()) as ParticipationResponse
      setActivity(data.activity)
      return data
    },
    [activityId],
  )

  const cancel = useCallback(async () => {
    const participantId = activity?.viewerParticipation?.participantId
    if (!participantId) {
      throw new Error('You are not participating in this activity')
    }

    const res = await fetch(`/rpc/v1/activities/${activityId}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Failed to cancel participation (${res.status})`)
    }

    const data = (await res.json()) as ParticipationResponse
    setActivity(data.activity)
    return data
  }, [activity, activityId])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return {
    activity,
    isLoading,
    error,
    join,
    cancel,
    refetch: fetchActivity,
    setActivity,
  }
}

