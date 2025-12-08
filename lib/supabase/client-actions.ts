'use client'

import { createClient } from './client'

export interface SaveProfileResult {
  success: boolean
  error: string | null
}

export interface ProfileData {
  fullName: string
  dateOfBirth: string
  gender: string
  profilePictureUrl?: string | null
  interests: string[]
  bio?: string | null
  hobbies?: string[]
  distanceRadiusKm?: number
  availability?: {
    weekday_morning?: boolean
    weekday_afternoon?: boolean
    weekday_evening?: boolean
    weekend_anytime?: boolean
  }
}

export async function saveProfileFromClient(data: ProfileData): Promise<SaveProfileResult> {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Auth error:', authError)
    return { success: false, error: 'You must be logged in to save your profile' }
  }

  console.log('Saving profile for user:', user.id)
  console.log('Profile data:', data)

  // Prepare the profile data
  const profileData = {
    user_id: user.id,
    full_name: data.fullName,
    date_of_birth: data.dateOfBirth,
    gender: data.gender,
    profile_picture_url: data.profilePictureUrl || null,
    interests: data.interests || [],
    bio: data.bio || null,
    hobbies: data.hobbies || [],
    distance_radius_km: data.distanceRadiusKm || 25,
    availability: data.availability || {},
    accepted_tos: true,
    accepted_guidelines: true,
    accepted_tos_at: new Date().toISOString(),
    accepted_guidelines_at: new Date().toISOString(),
    profile_completed: true,
  }

  // Check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking profile:', checkError)
  }

  let error

  if (existingProfile) {
    // Update existing profile
    console.log('Updating existing profile')
    const result = await supabase
      .from('user_profiles')
      .update(profileData)
      .eq('user_id', user.id)
    error = result.error
  } else {
    // Insert new profile
    console.log('Creating new profile')
    const result = await supabase.from('user_profiles').insert(profileData)
    error = result.error
  }

  if (error) {
    console.error('Profile save error:', error)
    return { success: false, error: error.message }
  }

  console.log('Profile saved successfully!')
  return { success: true, error: null }
}

