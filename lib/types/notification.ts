export type NotificationType =
  | 'recommendation_match'
  | 'upcoming_activity'
  | 'participant_joined'
  | 'participant_cancelled'
  | 'activity_time_changed'
  | 'activity_location_changed'
  | 'host_update'
  | 'safety_alert'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  payload: Record<string, unknown>
  isRead: boolean
  readAt: string | null
  createdAt: string | null
  activityId: string | null
  actorUserId: string | null
  channels: {
    inApp: boolean
    email: boolean
    browser: boolean
  }
}

export interface NotificationListResponse {
  items: NotificationItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface NotificationUnreadCountResponse {
  count: number
}

export interface NotificationPreferences {
  recommendedActivities: boolean
  upcomingActivityReminders: boolean
  hostJoinCancelUpdates: boolean
  timeLocationChangeAlerts: boolean
  safetyAlerts: boolean
  channelInApp: boolean
  channelEmail: boolean
  channelBrowser: boolean
  updatedAt: string | null
}

