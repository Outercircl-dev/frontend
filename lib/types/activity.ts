export interface ActivityLocation {
  address: string
  latitude: number
  longitude: number
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
  status: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface ActivitiesResponse {
  items: Activity[]
  total: number
  page: number
  limit: number
  totalPages: number
}


