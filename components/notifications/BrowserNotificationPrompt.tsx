'use client'

import { Button } from '@/components/ui/button'

interface BrowserNotificationPromptProps {
  permission: NotificationPermission | 'unsupported'
  onRequestPermission: () => Promise<NotificationPermission | 'unsupported'>
}

export function BrowserNotificationPrompt({
  permission,
  onRequestPermission,
}: BrowserNotificationPromptProps) {
  if (permission === 'unsupported') {
    return <p className="text-sm text-muted-foreground">Browser notifications are not supported in this browser.</p>
  }

  if (permission === 'granted') {
    return <p className="text-sm text-emerald-600">Browser notifications are enabled.</p>
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-muted-foreground">
        Browser notifications are blocked. Enable permissions in your browser settings.
      </p>
    )
  }

  return (
    <Button type="button" variant="outline" onClick={() => void onRequestPermission()}>
      Enable browser notifications
    </Button>
  )
}

