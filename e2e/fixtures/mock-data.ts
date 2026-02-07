import type { Activity, ActivitiesResponse, ParticipationState } from '@/lib/types/activity'
import type { ActivityMessage, ActivityMessagesResponse } from '@/lib/types/message'
import type { FeedbackFormResponse, FeedbackSubmissionSummary } from '@/lib/types/feedback'
import type { MembershipTierRules } from '@/lib/types/auth'

const nowIso = new Date().toISOString()

export const baseTierRules: MembershipTierRules = {
  metadata: {
    tierClass: 'free',
    displayName: 'Free',
  },
  hosting: {
    maxParticipantsPerActivity: 4,
    maxHostsPerMonth: 2,
    enforceExactMaxParticipants: false,
  },
  groups: {
    enabled: false,
    maxMembers: 12,
  },
  ads: {
    showsAds: false,
  },
  verification: {
    requiresVerifiedHostForHosting: false,
  },
  messaging: {
    groupChatEnabled: true,
    automatedMessagesEnabled: true,
  },
}

export const baseAuthUser = {
  id: 'user-1',
  email: 'alex@outercircl.com',
  supabaseUserId: 'supabase-user-1',
  role: 'authenticated',
  type: 'FREE',
  tierRules: baseTierRules,
}

export const baseAuthProfile = {
  emailVerified: true,
  profileCompleted: true,
}

export const baseAuthState = {
  state: 'active',
  redirectUrl: null,
  user: baseAuthUser,
  profile: baseAuthProfile,
}

export const buildActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-1',
  hostId: 'host-1',
  title: 'Sunrise Run',
  description: 'Start the day with a 5K along the river.',
  category: 'fitness',
  interests: ['running', 'coffee'],
  location: {
    address: 'Riverside Park',
    latitude: 53.35,
    longitude: -6.26,
  },
  activityDate: '2026-03-14',
  startTime: '07:00:00',
  endTime: '08:15:00',
  maxParticipants: 12,
  currentParticipants: 6,
  waitlistCount: 1,
  status: 'published',
  isPublic: true,
  createdAt: nowIso,
  updatedAt: nowIso,
  meetingPointHidden: false,
  ...overrides,
})

export const withViewerStatus = (
  activity: Activity,
  status: ParticipationState | 'not_joined',
): Activity => {
  if (status === 'not_joined') {
    const { viewerParticipation, ...rest } = activity
    return { ...rest }
  }
  return {
    ...activity,
    viewerParticipation: {
      participantId: 'participant-1',
      status,
      waitlistPosition: status === 'waitlisted' ? 3 : null,
      joinedAt: nowIso,
      approvedAt: status === 'confirmed' ? nowIso : null,
    },
  }
}

export const buildActivitiesResponse = (items: Activity[] = [buildActivity()]): ActivitiesResponse => ({
  items,
  total: items.length,
  page: 1,
  limit: 20,
  totalPages: 1,
})

export const buildMessage = (overrides: Partial<ActivityMessage> = {}): ActivityMessage => ({
  id: 'message-1',
  activityId: 'activity-1',
  authorProfileId: 'profile-1',
  authorName: 'Jamie',
  authorAvatarUrl: null,
  content: 'Excited for this!',
  messageType: 'user',
  isPinned: false,
  metadata: null,
  createdAt: nowIso,
  updatedAt: nowIso,
  ...overrides,
})

export const buildMessagesResponse = (
  items: ActivityMessage[] = [buildMessage()],
): ActivityMessagesResponse => ({
  items,
  total: items.length,
  page: 1,
  limit: 100,
  totalPages: 1,
})

export const buildFeedbackForm = (overrides: Partial<FeedbackFormResponse> = {}): FeedbackFormResponse => ({
  activityId: 'activity-1',
  eligible: true,
  activityEnded: true,
  submitted: false,
  participants: [
    {
      profileId: 'profile-1',
      supabaseUserId: 'supabase-user-2',
      fullName: 'Jamie',
      avatarUrl: null,
      isHost: false,
      ratingSummary: {
        averageRating: 4.8,
        ratingsCount: 12,
        activityCount: 8,
      },
    },
  ],
  ...overrides,
})

export const buildFeedbackSubmission = (
  overrides: Partial<FeedbackSubmissionSummary> = {},
): FeedbackSubmissionSummary => ({
  rating: 5,
  comment: 'Loved the vibe.',
  consentToAnalysis: true,
  participantRatings: [
    {
      profileId: 'profile-1',
      rating: 5,
      comment: 'Great host.',
    },
  ],
  ...overrides,
})

export const buildParticipants = () => [
  {
    id: 'participant-1',
    profileId: 'profile-1',
    supabaseUserId: 'supabase-user-2',
    fullName: 'Jamie',
    avatarUrl: null,
    status: 'pending',
    waitlistPosition: null,
    approvalMessage: 'Looking forward to it!',
  },
]
