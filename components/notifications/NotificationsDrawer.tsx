'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { OPEN_NOTIFICATIONS_DRAWER_EVENT } from '@/components/notifications/drawer-events'
import { BrowserNotificationPrompt } from '@/components/notifications/BrowserNotificationPrompt'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'

type PreferenceField =
  | 'recommendedActivities'
  | 'upcomingActivityReminders'
  | 'hostJoinCancelUpdates'
  | 'timeLocationChangeAlerts'
  | 'safetyAlerts'
  | 'channelInApp'
  | 'channelEmail'
  | 'channelBrowser'

const preferenceFields: Array<{ key: PreferenceField; label: string }> = [
  { key: 'recommendedActivities', label: 'Recommended activity matches' },
  { key: 'upcomingActivityReminders', label: 'Upcoming activity reminders' },
  { key: 'hostJoinCancelUpdates', label: 'Host join/cancel updates' },
  { key: 'timeLocationChangeAlerts', label: 'Time/location change alerts' },
  { key: 'safetyAlerts', label: 'Safety alerts' },
  { key: 'channelInApp', label: 'In-app notifications' },
  { key: 'channelEmail', label: 'Email notifications' },
  { key: 'channelBrowser', label: 'Browser notifications' },
]

const HIDDEN_PREFIXES = ['/login', '/auth', '/rpc']

export function NotificationsDrawer() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, refresh } = useNotifications(20)
  const { preferences, isSavingPreferences, updatePreferences, permission, requestPermission } = useNotifications()

  const shouldRender = useMemo(() => {
    if (!pathname) return false
    return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  }, [pathname])

  useEffect(() => {
    if (!shouldRender) {
      setIsOpen(false)
      return
    }

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

  const togglePreference = async (key: PreferenceField, value: boolean) => {
    await updatePreferences({ [key]: value })
  }

  return (
    <>
      {isOpen ? <button className="fixed inset-0 z-80 bg-black/40" onClick={() => setIsOpen(false)} /> : null}

      <aside
        className={`fixed right-0 top-0 z-90 h-full w-full max-w-full transform border-l bg-background shadow-2xl transition-transform duration-300 sm:max-w-md ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
              </div>
            </Card>

            <Card className="space-y-3 p-3">
              <p className="text-sm font-medium">Browser notifications</p>
              <BrowserNotificationPrompt permission={permission} onRequestPermission={requestPermission} />
            </Card>

            <Card className="space-y-3 p-3">
              <p className="text-sm font-medium">Preferences</p>
              {preferences
                ? preferenceFields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-3">
                      <Label htmlFor={`drawer-pref-${field.key}`} className="pr-3 text-sm leading-snug">
                        {field.label}
                      </Label>
                      <Checkbox
                        id={`drawer-pref-${field.key}`}
                        checked={Boolean(preferences[field.key])}
                        disabled={isSavingPreferences}
                        onCheckedChange={(checked) => void togglePreference(field.key, checked === true)}
                      />
                    </div>
                  ))
                : <p className="text-sm text-muted-foreground">Loading preferences...</p>}
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

