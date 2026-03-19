import type { OnboardingFormData, UserProfile } from '@/lib/types/profile'
import { defaultProfileValues } from '@/lib/validations/profile'

function normalizeDateForInput(dateValue: string | null | undefined): string {
  if (!dateValue) return ''
  return dateValue.includes('T') ? dateValue.split('T')[0] : dateValue
}

export function mapUserProfileToForm(profile: UserProfile): OnboardingFormData {
  return {
    ...defaultProfileValues,
    username: profile.username ?? '',
    fullName: profile.full_name ?? '',
    dateOfBirth: normalizeDateForInput(profile.date_of_birth),
    gender: profile.gender,
    profilePictureUrl: profile.profile_picture_url ?? undefined,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    bio: profile.bio ?? '',
    hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
    distanceRadiusKm: profile.distance_radius_km ?? 25,
    availability: {
      weekday_morning: Boolean(profile.availability?.weekday_morning),
      weekday_afternoon: Boolean(profile.availability?.weekday_afternoon),
      weekday_evening: Boolean(profile.availability?.weekday_evening),
      weekend_anytime: Boolean(profile.availability?.weekend_anytime),
    },
    acceptedTos: Boolean(profile.accepted_tos),
    acceptedGuidelines: Boolean(profile.accepted_guidelines),
    // Existing completed profiles should default these confirmations to true in edit mode.
    confirmedAge: true,
    confirmedPlatonic: true,
  }
}
