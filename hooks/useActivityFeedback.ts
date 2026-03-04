'use client'

import { useCallback, useEffect, useState } from 'react'

import type { FeedbackFormResponse, FeedbackSubmissionPayload, FeedbackSubmissionSummary } from '@/lib/types/feedback'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'

export function useActivityFeedback(activityId: string) {
  const [form, setForm] = useState<FeedbackFormResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForm = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchJson<FeedbackFormResponse>(
        `/rpc/v1/activities/${activityId}/feedback`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        'Failed to load feedback form',
      )
      setForm(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load feedback'))
      setForm(null)
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  const submitFeedback = useCallback(
    async (payload: FeedbackSubmissionPayload): Promise<FeedbackSubmissionSummary> => {
      const data = await fetchJson<FeedbackSubmissionSummary>(
        `/rpc/v1/activities/${activityId}/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload ?? {}),
        },
        'Failed to submit feedback',
      )
      setForm((prev) =>
        prev
          ? {
              ...prev,
              submitted: true,
              feedback: data,
            }
          : prev,
      )
      return data
    },
    [activityId],
  )

  useEffect(() => {
    fetchForm()
  }, [fetchForm])

  return {
    form,
    isLoading,
    error,
    refetch: fetchForm,
    submitFeedback,
  }
}

