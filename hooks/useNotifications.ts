'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fireBrowserNotification,
  getBrowserPermission,
  requestBrowserPermission as askBrowserPermission,
} from '@/lib/utils/browser-notifications'
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferences,
  NotificationUnreadCountResponse,
} from '@/lib/types/notification'

export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shownNotificationIds = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    const response = await fetch(`/rpc/v1/notifications?limit=${limit}`)
    if (!response.ok) {
      throw new Error(`Failed to load notifications (${response.status})`)
    }
    const data = (await response.json()) as NotificationListResponse
    setNotifications(data.items ?? [])
  }, [limit])

  const fetchUnreadCount = useCallback(async () => {
    const response = await fetch('/rpc/v1/notifications/unread-count')
    if (!response.ok) {
      throw new Error(`Failed to load unread count (${response.status})`)
    }
    const data = (await response.json()) as NotificationUnreadCountResponse
    setUnreadCount(data.count ?? 0)
  }, [])

  const fetchPreferences = useCallback(async () => {
    const response = await fetch('/rpc/v1/notifications/preferences')
    if (!response.ok) {
      throw new Error(`Failed to load notification preferences (${response.status})`)
    }
    const data = (await response.json()) as NotificationPreferences
    setPreferences(data)
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchNotifications(), fetchUnreadCount(), fetchPreferences()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [fetchNotifications, fetchPreferences, fetchUnreadCount])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const response = await fetch(`/rpc/v1/notifications/${notificationId}/read`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Failed to mark notification as read (${response.status})`)
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      setUnreadCount((count) => Math.max(0, count - 1))
    },
    [],
  )

  const markAllAsRead = useCallback(async () => {
    const response = await fetch('/rpc/v1/notifications/read-all', {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Failed to mark all notifications as read (${response.status})`)
    }

    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
        readAt: now,
      })),
    )
    setUnreadCount(0)
  }, [])

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    setIsSavingPreferences(true)
    try {
      const response = await fetch('/rpc/v1/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        throw new Error(`Failed to update preferences (${response.status})`)
      }
      const data = (await response.json()) as NotificationPreferences
      setPreferences(data)
      return data
    } finally {
      setIsSavingPreferences(false)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    const result = await askBrowserPermission()
    setPermission(result)
    return result
  }, [])

  useEffect(() => {
    setPermission(getBrowserPermission())
    void refresh()
  }, [refresh])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchNotifications()
      void fetchUnreadCount()
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchNotifications, fetchUnreadCount])

  useEffect(() => {
    if (permission !== 'granted') {
      return
    }
    notifications
      .filter((item) => !item.isRead && item.channels.browser)
      .forEach((item) => {
        if (!shownNotificationIds.current.has(item.id)) {
          shownNotificationIds.current.add(item.id)
          fireBrowserNotification(item)
        }
      })
  }, [notifications, permission])

  return {
    notifications,
    unreadCount,
    preferences,
    permission,
    isLoading,
    isSavingPreferences,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    requestPermission,
  }
}

