'use client'

import { useCallback, useEffect, useState } from 'react'

import type { FeedbackFormResponse, FeedbackSubmissionPayload, FeedbackSubmissionSummary } from '@/lib/types/feedback'

export function useActivityFeedback(activityId: string) {
  const [form, setForm] = useState<FeedbackFormResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForm = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/rpc/v1/activities/${activityId}/feedback`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to load feedback form (${res.status})`)
      }
      const data = (await res.json()) as FeedbackFormResponse
      setForm(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
      setForm(null)
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  const submitFeedback = useCallback(
    async (payload: FeedbackSubmissionPayload): Promise<FeedbackSubmissionSummary> => {
      const res = await fetch(`/rpc/v1/activities/${activityId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to submit feedback (${res.status})`)
      }

      const data = (await res.json()) as FeedbackSubmissionSummary
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

