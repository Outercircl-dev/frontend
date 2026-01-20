export type ActivityMessageType = 'user' | 'system' | 'announcement' | 'survey'

export interface ActivityMessage {
  id: string
  activityId: string
  authorProfileId: string | null
  authorName: string | null
  authorAvatarUrl: string | null
  content: string
  messageType: ActivityMessageType
  isPinned: boolean
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ActivityMessagesResponse {
  items: ActivityMessage[]
  total: number
  page: number
  limit: number
  totalPages: number
}


