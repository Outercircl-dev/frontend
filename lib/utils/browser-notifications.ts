import type { NotificationItem } from '@/lib/types/notification'

export function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.requestPermission()
}

export function fireBrowserNotification(item: NotificationItem) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }
  if (Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(item.title, {
    body: item.body,
    tag: item.id,
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}

