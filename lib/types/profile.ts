// User Profile Types for OuterCircl
// SRS Requirements: F1 (User Registration), F7 (User Profile & Preferences)

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Availability {
  weekday_morning?: boolean
  weekday_afternoon?: boolean
  weekday_evening?: boolean
  weekend_anytime?: boolean
}

export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  date_of_birth: string
  gender: Gender
  profile_picture_url: string | null
  bio: string | null
  interests: string[]
  hobbies: string[]
  availability: Availability
  distance_radius_km: number
  accepted_tos: boolean
  accepted_guidelines: boolean
  accepted_tos_at: string | null
  accepted_guidelines_at: string | null
  profile_completed: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Interest {
  id: string
  slug: string
  name: string
  category: string
  icon: string
  sort_order: number
}

export interface InterestCategory {
  name: string
  interests: Interest[]
}

// Form state types
export interface ProfileFormState {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  errors?: Record<string, string[]>
}

// Onboarding step types
export type OnboardingStep = 1 | 2 | 3 | 4

// Form data type (allows empty strings during input)
export interface OnboardingFormData {
  // Step 1: Basic Info
  fullName: string
  dateOfBirth: string
  gender: Gender | ''
  profilePictureUrl?: string
  // Step 2: Interests
  interests: string[]
  // Step 3: Preferences
  bio: string
  hobbies: string[]
  distanceRadiusKm: number
  availability: Availability
  // Step 4: Guidelines
  acceptedTos: boolean
  acceptedGuidelines: boolean
  confirmedAge: boolean
  confirmedPlatonic: boolean
}

// Validated onboarding data (after form validation)
export interface OnboardingData {
  // Step 1: Basic Info
  fullName: string
  dateOfBirth: string
  gender: Gender
  profilePictureUrl?: string
  // Step 2: Interests
  interests: string[]
  // Step 3: Preferences
  bio?: string
  hobbies?: string[]
  distanceRadiusKm: number
  availability?: Availability
  // Step 4: Guidelines
  acceptedTos: true
  acceptedGuidelines: true
  confirmedAge: true
  confirmedPlatonic: true
}

export const defaultOnboardingData: OnboardingFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  profilePictureUrl: undefined,
  interests: [],
  bio: '',
  hobbies: [],
  distanceRadiusKm: 25,
  availability: {
    weekday_morning: false,
    weekday_afternoon: false,
    weekday_evening: false,
    weekend_anytime: false,
  },
  acceptedTos: false,
  acceptedGuidelines: false,
  confirmedAge: false,
  confirmedPlatonic: false,
}

