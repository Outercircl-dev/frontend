// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { OPEN_NOTIFICATIONS_DRAWER_EVENT } from '@/components/notifications/drawer-events'
import { BrowserNotificationPrompt } from '@/components/notifications/BrowserNotificationPrompt'
import { NotificationBodyText } from '@/components/notifications/NotificationBodyText'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNotifications } from '@/hooks/useNotifications'

const HIDDEN_PREFIXES = ['/login', '/auth', '/rpc']

export function NotificationsDrawer() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, refresh } = useNotifications(20)
  const { permission, requestPermission } = useNotifications()

  const shouldRender = useMemo(() => {
    if (!pathname) return false
    return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  useEffect(() => {
    if (!shouldRender) return

    const handler = () => {
      setIsOpen(true)
      void refresh()
    }

    window.addEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handler)
    return () => {
      window.removeEventListener(OPEN_NOTIFICATIONS_DRAWER_EVENT, handler)
    }
  }, [refresh, shouldRender])

  if (!shouldRender) {
    return null
  }

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close notifications drawer"
          className="fixed inset-0 z-90 bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed right-0 top-0 z-100 h-full w-full max-w-full transform border-l bg-background shadow-2xl transition-transform duration-300 sm:max-w-md ${
          isOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-base font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4 overflow-y-auto p-4">
            <Card className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Inbox</p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void refresh()}>
                    Refresh
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void markAllAsRead()}>
                    Mark all read
                  </Button>
                </div>
              </div>
              {isLoading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {!isLoading && !error && notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : null}

              <div className="space-y-2">
                {notifications.map((item) => (
                  <div key={item.id} className={`rounded-md border p-2 ${item.isRead ? 'bg-background' : 'bg-muted/40'}`}>
                    <p className="text-sm font-medium">{item.title}</p>
                    <NotificationBodyText body={item.body} className="mt-1 text-xs text-muted-foreground" />
                    {!item.isRead ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs"
                        onClick={() => void markAsRead(item.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-3 p-3">
              <p className="text-sm font-medium">Browser notifications</p>
              <BrowserNotificationPrompt permission={permission} onRequestPermission={requestPermission} />
            </Card>

            <Card className="space-y-3 p-3">
              <p className="text-sm font-medium">Preferences moved</p>
              <p className="text-sm text-muted-foreground">
                Manage notification preferences from Settings.
              </p>
            </Card>
          </div>

          <div className="border-t px-4 py-3">
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
              <Bell className="mr-2 h-4 w-4" />
              Close notifications
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

