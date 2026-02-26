'use client'

import { Bell, BellRing } from 'lucide-react'

import { openNotificationsDrawer } from '@/components/notifications/drawer-events'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotifications } from '@/hooks/useNotifications'

export function ProfileNotificationsSection() {
  const { notifications, unreadCount, isLoading, error, markAsRead } = useNotifications(5)
  const items = notifications.slice(0, 5)

  return (
    <Card className="border-muted/70">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="inline-flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Notifications
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {unreadCount} unread
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!isLoading && !error && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className={`rounded-lg border p-3 ${item.isRead ? 'bg-background' : 'bg-muted/30'}`}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
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

        <Button type="button" variant="outline" className="w-full justify-start" onClick={openNotificationsDrawer}>
          <Bell className="mr-2 h-4 w-4" />
          Open notification drawer
        </Button>
      </CardContent>
    </Card>
  )
}

