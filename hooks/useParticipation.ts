'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Activity } from '@/lib/types/activity'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'
import { trackActivityJoined } from '@/lib/analytics/events'

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
      const data = await fetchJson<Activity>(
        `/rpc/v1/activities/${activityId}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        'Failed to load activity',
      )
      setActivity(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Unknown error loading activity'))
      setActivity(null)
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  const join = useCallback(
    async (options?: JoinOptions) => {
      const data = await fetchJson<ParticipationResponse>(
        `/rpc/v1/activities/${activityId}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options ?? {}),
        },
        'Failed to join activity',
      )
      setActivity(data.activity)
      trackActivityJoined(activityId)
      return data
    },
    [activityId],
  )

  const cancel = useCallback(async () => {
    const participantId = activity?.viewerParticipation?.participantId
    if (!participantId) {
      throw new Error('You are not participating in this activity')
    }

    const data = await fetchJson<ParticipationResponse>(
      `/rpc/v1/activities/${activityId}/participants`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      },
      'Failed to cancel participation',
    )
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

