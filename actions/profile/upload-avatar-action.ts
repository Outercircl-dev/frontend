'use server'

import { createClient } from '@/lib/supabase/server'
import { buildApiUrl } from '@/lib/utils/api-url'

const API_URL = process.env.API_URL

export interface UploadAvatarResult {
  url: string | null
  error: string | null
}

export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarResult> {
  // Get Supabase session (for access token) - this is server-side, not direct client communication
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    return { url: null, error: 'You must be logged in to upload an avatar' }
  }

  // Get current user (for user ID only - needed for file path)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { url: null, error: 'You must be logged in to upload an avatar' }
  }

  const file = formData.get('avatar') as File | null

  if (!file) {
    return { url: null, error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' }
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { url: null, error: 'File too large. Maximum size is 5MB.' }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  // Delete existing avatar if any
  const { data: existingFiles } = await supabase.storage
    .from('avatars')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filesToDelete)
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    return { url: null, error: 'Failed to upload avatar. Please try again.' }
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(fileName)

  // Update user profile with new avatar URL via backend API
  if (API_URL) {
    try {
      const updateResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture_url: publicUrl }),
        cache: 'no-store',
      })

      if (!updateResponse.ok) {
        console.warn('Avatar uploaded but profile update failed:', updateResponse.status)
        // Return partial success - file uploaded but profile not updated
        return { url: publicUrl, error: 'Avatar uploaded but profile update failed' }
      }
    } catch (error) {
      console.error('Failed to update profile with avatar URL:', error)
      // Return partial success - file uploaded but profile update failed
      return { url: publicUrl, error: 'Avatar uploaded but profile update failed' }
    }
  }

  return { url: publicUrl, error: null }
}

export async function deleteAvatarAction(): Promise<{ success: boolean; error: string | null }> {
  // Get Supabase session (for access token) - this is server-side, not direct client communication
  const supabase = await createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  if (!accessToken) {
    return { success: false, error: 'You must be logged in' }
  }

  // Get current user (for user ID only - needed for file path)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'You must be logged in' }
  }

  // Delete all files in user's avatar folder
  const { data: existingFiles } = await supabase.storage
    .from('avatars')
    .list(user.id)

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
    const { error } = await supabase.storage.from('avatars').remove(filesToDelete)

    if (error) {
      console.error('Delete avatar error:', error)
      return { success: false, error: 'Failed to delete avatar' }
    }
  }

  // Clear profile picture URL via backend API
  if (API_URL) {
    try {
      const updateResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture_url: null }),
        cache: 'no-store',
      })

      if (!updateResponse.ok) {
        console.warn('Avatar deleted but profile update failed:', updateResponse.status)
        // Return partial success - file deleted but profile not updated
        return { success: false, error: 'Avatar deleted but profile update failed' }
      }
    } catch (error) {
      console.error('Failed to update profile to remove avatar URL:', error)
      // Return partial failure - file deleted but profile not updated
      return { success: false, error: 'Avatar deleted but profile update failed' }
    }
  }

  return { success: true, error: null }
}

