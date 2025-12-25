'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { completeProfileSchema } from '@/lib/validations/profile'
import type { ProfileFormState } from '@/lib/types/profile'
import { buildApiUrl } from '@/lib/utils/api-url'

const API_URL = process.env.API_URL

export async function completeProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {

  // Parse form data
  const rawData = {
    fullName: formData.get('fullName') as string,
    dateOfBirth: formData.get('dateOfBirth') as string,
    gender: formData.get('gender') as string,
    interests: formData.getAll('interests') as string[],
    bio: (formData.get('bio') as string) || '',
    hobbies: (formData.getAll('hobbies') as string[]).filter(Boolean),
    distanceRadiusKm: Number(formData.get('distanceRadiusKm')) || 25,
    availability: {
      weekday_morning: formData.get('weekday_morning') === 'true',
      weekday_afternoon: formData.get('weekday_afternoon') === 'true',
      weekday_evening: formData.get('weekday_evening') === 'true',
      weekend_anytime: formData.get('weekend_anytime') === 'true',
    },
    acceptedTos: formData.get('acceptedTos') === 'true',
    acceptedGuidelines: formData.get('acceptedGuidelines') === 'true',
    confirmedAge: formData.get('confirmedAge') === 'true',
    confirmedPlatonic: formData.get('confirmedPlatonic') === 'true',
  }

  // Validate
  const parsed = completeProfileSchema.safeParse(rawData)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(fieldErrors).flat()[0] || 'Please fix the errors below'
    return {
      status: 'error',
      message: firstError,
      errors: fieldErrors as Record<string, string[]>,
    }
  }

  const profilePictureUrl = formData.get('profilePictureUrl') as string | null

  // Get Supabase session (for access token) - this is server-side, not direct client communication
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    return { status: 'error', message: 'You must be logged in to complete your profile' }
  }

  // Prepare profile data for backend (backend expects camelCase per ProfileInput interface)
  const profileData = {
    fullName: parsed.data.fullName,
    dateOfBirth: parsed.data.dateOfBirth,
    gender: parsed.data.gender,
    profilePictureUrl: profilePictureUrl || null,
    bio: parsed.data.bio || null,
    interests: parsed.data.interests,
    hobbies: parsed.data.hobbies || [],
    availability: parsed.data.availability || {},
    distanceRadiusKm: parsed.data.distanceRadiusKm,
    acceptedTos: true,
    acceptedGuidelines: true,
    confirmedAge: parsed.data.confirmedAge,
    confirmedPlatonic: parsed.data.confirmedPlatonic,
  }

  // Call backend API directly (following architecture pattern)
  if (!API_URL) {
      console.error('API_URL is not configured')
    return {
      status: 'error',
      message: 'Backend URL not configured',
    }
  }

  try {
    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
      cache: 'no-store',
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend /api/profile POST error:', backendResponse.status, errorText)
      return {
        status: 'error',
        message: 'Failed to save profile. Please try again.',
      }
    }
  } catch (error) {
    console.error('Profile save error:', error)
    return {
      status: 'error',
      message: 'Failed to save profile. Please try again.',
    }
  }

  revalidatePath('/profile')
  redirect('/profile')
}

// Simplified version for step-by-step saving
export async function saveProfileStepAction(
  step: number,
  data: Record<string, unknown>
): Promise<ProfileFormState> {
  // Get Supabase session (for access token) - this is server-side, not direct client communication
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    console.error('Auth error in saveProfileStepAction: No access token')
    return { status: 'error', message: 'You must be logged in' }
  }

  // Build update object based on step
  let updateData: Record<string, unknown> = {}

  switch (step) {
    case 0:
      // Save ALL data at once (used on final submit)
      updateData = {
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
      break
    case 1:
      updateData = {
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        profile_picture_url: data.profilePictureUrl || null,
      }
      break
    case 2:
      updateData = {
        interests: data.interests,
      }
      break
    case 3:
      updateData = {
        bio: data.bio || null,
        hobbies: data.hobbies || [],
        distance_radius_km: data.distanceRadiusKm || 25,
        availability: data.availability || {},
      }
      break
    case 4:
      updateData = {
        accepted_tos: true,
        accepted_guidelines: true,
        accepted_tos_at: new Date().toISOString(),
        accepted_guidelines_at: new Date().toISOString(),
        profile_completed: true,
      }
      break
  }

  console.log('Saving profile data - Step:', step)
  console.log('Update data:', JSON.stringify(updateData, null, 2))

  // Prepare profile data - if inserting new, include required fields
  const profileData = {
    full_name: (data.fullName as string) || 'New User',
    date_of_birth: (data.dateOfBirth as string) || '2000-01-01',
    gender: (data.gender as string) || 'prefer_not_to_say',
    interests: (data.interests as string[]) || [],
    ...updateData,
  }

  // Call backend API directly (following architecture pattern)
  if (!API_URL) {
      console.error('API_URL is not configured')
    return { status: 'error', message: 'Backend URL not configured' }
  }

  try {
    const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
      cache: 'no-store',
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend /api/profile PUT error:', backendResponse.status, errorText)
      return { status: 'error', message: 'Failed to save profile step' }
    }

    console.log('Profile saved successfully!')
    return { status: 'success', message: 'Progress saved' }
  } catch (error) {
    console.error('Save profile step error:', error)
    return { status: 'error', message: error instanceof Error ? error.message : 'Failed to save profile step' }
  }
}

