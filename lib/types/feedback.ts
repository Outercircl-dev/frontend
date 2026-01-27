export interface UserRatingSummary {
  averageRating: number | null
  ratingsCount: number
  activityCount: number
}

export interface FeedbackParticipantSummary {
  profileId: string
  supabaseUserId: string
  fullName: string | null
  avatarUrl: string | null
  isHost: boolean
  ratingSummary?: UserRatingSummary
}

export interface FeedbackSubmissionSummary {
  rating: number
  comment: string | null
  consentToAnalysis: boolean
  participantRatings: Array<{
    profileId: string
    rating: number
    comment: string | null
  }>
}

export interface FeedbackFormResponse {
  activityId: string
  eligible: boolean
  activityEnded: boolean
  submitted: boolean
  reason?: string
  participants: FeedbackParticipantSummary[]
  feedback?: FeedbackSubmissionSummary
}

export interface FeedbackSubmissionPayload {
  rating: number
  comment?: string
  consentToAnalysis: boolean
  participantRatings?: Array<{
    profileId: string
    rating: number
    comment?: string
  }>
}

