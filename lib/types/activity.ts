export interface ActivityLocation {
  address: string
  latitude: number
  longitude: number
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
  title: string
  description: string
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


