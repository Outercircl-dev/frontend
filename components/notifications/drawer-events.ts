export const OPEN_NOTIFICATIONS_DRAWER_EVENT = 'outercircl:open-notifications-drawer'

export function openNotificationsDrawer() {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_DRAWER_EVENT))
}

