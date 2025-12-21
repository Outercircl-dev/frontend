import { z } from 'zod'

// Gender options enum
export const genderOptions = ['male', 'female', 'other', 'prefer_not_to_say'] as const
export type Gender = (typeof genderOptions)[number]

// Availability options
export const availabilityOptions = [
  { id: 'weekday_morning', label: 'Weekday Mornings' },
  { id: 'weekday_afternoon', label: 'Weekday Afternoons' },
  { id: 'weekday_evening', label: 'Weekday Evenings' },
  { id: 'weekend_anytime', label: 'Weekend Anytime' },
] as const

// Step 1: Basic Info Schema
export const basicInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(
      /^[a-zA-Z\s'\-]+$/,
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  dateOfBirth: z.string().refine(
    (date) => {
      if (!date) return false
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const actualAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age
      return actualAge >= 18
    },
    { message: 'You must be at least 18 years old' }
  ),
  gender: z.enum(genderOptions, {
    message: 'Please select a gender',
  }),
})

// Step 2: Interests Schema
export const interestsSchema = z.object({
  interests: z
    .array(z.string())
    .min(3, 'Select at least 3 interests')
    .max(10, 'Select at most 10 interests'),
})

// Step 3: Preferences Schema
export const preferencesSchema = z.object({
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  hobbies: z.array(z.string()).max(10, 'Maximum 10 hobbies').optional(),
  distanceRadiusKm: z
    .number()
    .min(1, 'Minimum 1 km')
    .max(100, 'Maximum 100 km')
    .default(25),
  availability: z
    .object({
      weekday_morning: z.boolean().default(false),
      weekday_afternoon: z.boolean().default(false),
      weekday_evening: z.boolean().default(false),
      weekend_anytime: z.boolean().default(false),
    })
    .optional(),
})

// Step 4: Guidelines Schema
export const guidelinesSchema = z.object({
  acceptedTos: z.literal(true, {
    message: 'You must accept the Terms of Service',
  }),
  acceptedGuidelines: z.literal(true, {
    message: 'You must accept the Community Guidelines',
  }),
  confirmedAge: z.literal(true, {
    message: 'You must confirm you are 18 or older',
  }),
  confirmedPlatonic: z.literal(true, {
    message: 'You must acknowledge OuterCircl is for platonic connections',
  }),
})

// Complete profile schema (all steps combined)
export const completeProfileSchema = basicInfoSchema
  .merge(interestsSchema)
  .merge(preferencesSchema)
  .merge(guidelinesSchema)

// UserProfile schema for API response validation
export const userProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  full_name: z.string(),
  date_of_birth: z.string(),
  gender: z.enum(genderOptions),
  profile_picture_url: z.string().nullable(),
  bio: z.string().nullable(),
  interests: z.array(z.string()),
  hobbies: z.array(z.string()),
  availability: z
    .object({
      weekday_morning: z.boolean().optional(),
      weekday_afternoon: z.boolean().optional(),
      weekday_evening: z.boolean().optional(),
      weekend_anytime: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  distance_radius_km: z.number(),
  accepted_tos: z.boolean(),
  accepted_guidelines: z.boolean(),
  accepted_tos_at: z.string().nullable(),
  accepted_guidelines_at: z.string().nullable(),
  profile_completed: z.boolean(),
  is_verified: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

// Type exports
export type BasicInfoData = z.infer<typeof basicInfoSchema>
export type InterestsData = z.infer<typeof interestsSchema>
export type PreferencesData = z.infer<typeof preferencesSchema>
export type GuidelinesData = z.infer<typeof guidelinesSchema>
export type CompleteProfileData = z.infer<typeof completeProfileSchema>
export type UserProfileData = z.infer<typeof userProfileSchema>

// Default values for form initialization (matches OnboardingFormData)
export const defaultProfileValues = {
  fullName: '',
  dateOfBirth: '',
  gender: '' as const,
  profilePictureUrl: undefined,
  interests: [] as string[],
  bio: '',
  hobbies: [] as string[],
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

