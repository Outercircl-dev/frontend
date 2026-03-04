'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { ActivityMessage, ActivityMessagesResponse, ActivityMessageType } from '@/lib/types/message'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'

interface CreateMessagePayload {
  content: string
  messageType?: Extract<ActivityMessageType, 'user' | 'announcement'>
  isPinned?: boolean
}

export function useActivityMessages(activityId: string) {
  const [messages, setMessages] = useState<ActivityMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sortMessages = useCallback((items: ActivityMessage[]) => {
    return [...items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1
      }
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return aDate - bDate
    })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchJson<ActivityMessagesResponse>(
        `/rpc/v1/activities/${activityId}/messages?limit=100`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        'Failed to load messages',
      )
      setMessages(sortMessages(data.items ?? []))
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load messages'))
    } finally {
      setIsLoading(false)
    }
  }, [activityId, sortMessages])

  const postMessage = useCallback(
    async (payload: CreateMessagePayload) => {
      const data = await fetchJson<ActivityMessage>(
        `/rpc/v1/activities/${activityId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'Failed to send message',
      )
      setMessages((prev) => sortMessages([data, ...prev.filter((item) => item.id !== data.id)]))
      return data
    },
    [activityId, sortMessages],
  )

  const pinMessage = useCallback(
    async (messageId: string, isPinned: boolean) => {
      const data = await fetchJson<ActivityMessage>(
        `/rpc/v1/activities/${activityId}/messages/${messageId}/pin`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPinned }),
        },
        'Failed to update pin',
      )
      setMessages((prev) => {
        const next = prev.map((item) =>
          item.id === data.id ? data : isPinned && item.isPinned ? { ...item, isPinned: false } : item,
        )
        return sortMessages(next)
      })
      return data
    },
    [activityId, sortMessages],
  )

  const reportMessage = useCallback(
    async (messageId: string, reason: string, details?: string) => {
      return fetchJson(
        `/rpc/v1/activities/${activityId}/messages/${messageId}/report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, details }),
        },
        'Failed to report message',
      )
    },
    [activityId],
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const mapRealtimeMessage = useCallback((payload: Record<string, unknown>): ActivityMessage => {
    return {
      id: String(payload.id ?? ''),
      activityId: String(payload.activity_id ?? ''),
      authorProfileId: typeof payload.author_profile_id === 'string' ? payload.author_profile_id : null,
      authorName: null,
      authorAvatarUrl: null,
      content: String(payload.content ?? ''),
      messageType: String(payload.message_type ?? 'user') as ActivityMessageType,
      isPinned: Boolean(payload.is_pinned),
      metadata:
        payload.metadata && typeof payload.metadata === 'object'
          ? (payload.metadata as Record<string, unknown>)
          : null,
      createdAt: typeof payload.created_at === 'string' ? payload.created_at : null,
      updatedAt: typeof payload.updated_at === 'string' ? payload.updated_at : null,
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`activity-messages-${activityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_messages',
          filter: `activity_id=eq.${activityId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const message = mapRealtimeMessage(payload.new as Record<string, unknown>)
            setMessages((prev) => sortMessages([message, ...prev.filter((item) => item.id !== message.id)]))
          }
          if (payload.eventType === 'UPDATE') {
            const message = mapRealtimeMessage(payload.new as Record<string, unknown>)
            setMessages((prev) => sortMessages(prev.map((item) => (item.id === message.id ? message : item))))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activityId, mapRealtimeMessage, sortMessages])

  const pinned = useMemo(() => messages.find((message) => message.isPinned), [messages])

  return {
    messages,
    pinned,
    isLoading,
    error,
    postMessage,
    pinMessage,
    reportMessage,
    refetch: fetchMessages,
  }
}

