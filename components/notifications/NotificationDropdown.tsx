'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { NotificationItem } from '@/lib/types/notification'

interface NotificationDropdownProps {
  notifications: NotificationItem[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
  onRefresh: () => Promise<void>
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  error,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
}: NotificationDropdownProps) {
  return (
    <Card className="absolute right-0 top-11 z-50 w-96 p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()}>
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onMarkAllRead()}>
            Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!isLoading && !error && notifications.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">No notifications yet.</p>
      ) : null}

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {notifications.map((item) => {
          const timeLabel = item.createdAt ? formatRelativeTime(item.createdAt) : 'just now'
          return (
            <div
              key={item.id}
              className={`rounded-md border p-2 ${item.isRead ? 'bg-background' : 'bg-muted/40'}`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{timeLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.body}</p>
              {!item.isRead ? (
                <div className="mt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => void onMarkRead(item.id)}>
                    Mark read
                  </Button>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function formatRelativeTime(value: string): string {
  const deltaMs = Date.now() - new Date(value).getTime()
  const deltaMinutes = Math.max(1, Math.floor(deltaMs / 60_000))
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`
  }
  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours < 24) {
    return `${deltaHours}h ago`
  }
  const deltaDays = Math.floor(deltaHours / 24)
  return `${deltaDays}d ago`
}

