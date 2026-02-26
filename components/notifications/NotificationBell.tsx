'use client'

import { Bell } from 'lucide-react'

import { openNotificationsDrawer } from '@/components/notifications/drawer-events'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationBell() {
  const { unreadCount } = useNotifications()

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Notifications"
        onClick={openNotificationsDrawer}
      >
        <Bell className="h-4 w-4" />
      </Button>
      {unreadCount > 0 ? (
        <Badge className="absolute -right-2 -top-2 min-w-5 justify-center px-1 text-[10px]">{unreadCount}</Badge>
      ) : null}
    </div>
  )
}

