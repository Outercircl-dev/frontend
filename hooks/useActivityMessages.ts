'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { ActivityMessage, ActivityMessagesResponse, ActivityMessageType } from '@/lib/types/message'

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
      const res = await fetch(`/rpc/v1/activities/${activityId}/messages?limit=100`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to load messages (${res.status})`)
      }
      const data = (await res.json()) as ActivityMessagesResponse
      setMessages(sortMessages(data.items ?? []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [activityId, sortMessages])

  const postMessage = useCallback(
    async (payload: CreateMessagePayload) => {
      const res = await fetch(`/rpc/v1/activities/${activityId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to send message (${res.status})`)
      }
      const data = (await res.json()) as ActivityMessage
      setMessages((prev) => sortMessages([data, ...prev.filter((item) => item.id !== data.id)]))
      return data
    },
    [activityId, sortMessages],
  )

  const pinMessage = useCallback(
    async (messageId: string, isPinned: boolean) => {
      const res = await fetch(`/rpc/v1/activities/${activityId}/messages/${messageId}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to update pin (${res.status})`)
      }
      const data = (await res.json()) as ActivityMessage
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
      const res = await fetch(`/rpc/v1/activities/${activityId}/messages/${messageId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to report message (${res.status})`)
      }
      return res.json()
    },
    [activityId],
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const mapRealtimeMessage = useCallback((payload: Record<string, any>): ActivityMessage => {
    return {
      id: payload.id,
      activityId: payload.activity_id,
      authorProfileId: payload.author_profile_id ?? null,
      authorName: null,
      authorAvatarUrl: null,
      content: payload.content,
      messageType: payload.message_type as ActivityMessageType,
      isPinned: Boolean(payload.is_pinned),
      metadata: (payload.metadata as Record<string, unknown>) ?? null,
      createdAt: payload.created_at ?? null,
      updatedAt: payload.updated_at ?? null,
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
            const message = mapRealtimeMessage(payload.new as Record<string, any>)
            setMessages((prev) => sortMessages([message, ...prev.filter((item) => item.id !== message.id)]))
          }
          if (payload.eventType === 'UPDATE') {
            const message = mapRealtimeMessage(payload.new as Record<string, any>)
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

