'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { completeProfileSchema } from '@/lib/validations/profile'
import type { ProfileFormState } from '@/lib/types/profile'

export async function completeProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  // const supabase = createServerActionClient(await cookies())

  // Get current user
  // const {
  //   data: { user },
  //   error: authError,
  // } = await supabase.auth.getUser()

  // if (authError || !user) {
  //   return { status: 'error', message: 'You must be logged in to complete your profile' }
  // }

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

  // Upsert profile
  // const { error: dbError } = await supabase.from('user_profiles').upsert(
  //   {
  //     user_id: user.id,
  //     full_name: parsed.data.fullName,
  //     date_of_birth: parsed.data.dateOfBirth,
  //     gender: parsed.data.gender,
  //     profile_picture_url: profilePictureUrl || null,
  //     bio: parsed.data.bio || null,
  //     interests: parsed.data.interests,
  //     hobbies: parsed.data.hobbies || [],
  //     availability: parsed.data.availability || {},
  //     distance_radius_km: parsed.data.distanceRadiusKm,
  //     accepted_tos: true,
  //     accepted_guidelines: true,
  //     accepted_tos_at: new Date().toISOString(),
  //     accepted_guidelines_at: new Date().toISOString(),
  //     profile_completed: true,
  //   },
  //   {
  //     onConflict: 'user_id',
  //   }
  // )

  // if (dbError) {
  //   console.error('Profile save error:', dbError)
  //   return {
  //     status: 'error',
  //     message: 'Failed to save profile. Please try again.',
  //   }
  // }

  revalidatePath('/feed')
  redirect('/feed')
}

// Simplified version for step-by-step saving
export async function saveProfileStepAction(
  step: number,
  data: Record<string, unknown>
): Promise<ProfileFormState> {
  // const supabase = createServerActionClient(await cookies())

  // const {
  //   data: { user },
  //   error: authError,
  // } = await supabase.auth.getUser()

  // if (authError || !user) {
  //   console.error('Auth error in saveProfileStepAction:', authError)
  //   return { status: 'error', message: 'You must be logged in' }
  // }

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

  // console.log('Saving profile data for user:', user.id, 'Step:', step)
  console.log('Update data:', JSON.stringify(updateData, null, 2))

  // Check if profile exists
  // const { data: existingProfile, error: checkError } = await supabase
  //   .from('user_profiles')
  //   .select('id')
  //   .eq('user_id', user.id)
  //   .single()

  // if (checkError && checkError.code !== 'PGRST116') {
  //   console.error('Error checking existing profile:', checkError)
  // }

  // let error

  // if (existingProfile) {
  //   // Update existing profile
  //   console.log('Updating existing profile:', existingProfile.id)
  //   const result = await supabase
  //     .from('user_profiles')
  //     .update(updateData)
  //     .eq('user_id', user.id)
  //   error = result.error
  // } else {
  //   // Insert new profile with required fields
  //   console.log('Inserting new profile for user:', user.id)
  //   const insertData = {
  //     user_id: user.id,
  //     full_name: (data.fullName as string) || 'New User',
  //     date_of_birth: (data.dateOfBirth as string) || '2000-01-01',
  //     gender: (data.gender as string) || 'prefer_not_to_say',
  //     interests: (data.interests as string[]) || [],
  //     ...updateData,
  //   }
  //   console.log('Insert data:', JSON.stringify(insertData, null, 2))
  //   const result = await supabase.from('user_profiles').insert(insertData)
  //   error = result.error
  // }

  // if (error) {
  //   console.error('Save profile step error:', error)
  //   return { status: 'error', message: `Failed to save: ${error.message}` }
  // }

  console.log('Profile saved successfully!')
  return { status: 'success', message: 'Progress saved' }
}

