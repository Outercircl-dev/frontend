export interface ActivityLocation {
  address: string
  latitude: number
  longitude: number
  placeId?: string
}

export type ParticipationState = 'not_joined' | 'pending' | 'confirmed' | 'waitlisted'

export interface ViewerParticipationMeta {
  participantId: string
  status: ParticipationState
  waitlistPosition: number | null
  joinedAt: string | null
  approvedAt: string | null
}

export interface Activity {
  id: string
  hostId: string
  hostUsername: string | null
  hostName: string | null
  title: string
  description: string
  imageUrl: string | null
  category: string
  interests: string[]
  location: ActivityLocation
  activityDate: string // YYYY-MM-DD
  startTime: string // HH:mm:ss
  endTime: string // HH:mm:ss
  maxParticipants: number
  currentParticipants: number
  waitlistCount: number
  status: string
  isPublic: boolean
  group?: {
    id: string
    name: string
    isPublic: boolean
  } | null
  recurrence?: {
    id: string
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endsOn: string | null
    occurrences: number | null
  } | null
  createdAt: string
  updatedAt: string
  meetingPointHidden: boolean
  viewerParticipation?: ViewerParticipationMeta
}

export interface ActivitiesResponse {
  items: Activity[]
  total: number
  page: number
  limit: number
  totalPages: number
}


