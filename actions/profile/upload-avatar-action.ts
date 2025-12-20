'use server'

import { createClient } from '@/lib/supabase/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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

//   const file = formData.get('avatar') as File | null

//   if (!file) {
//     return { url: null, error: 'No file provided' }
//   }

//   // Validate file type
//   const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
//   if (!allowedTypes.includes(file.type)) {
//     return { url: null, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' }
//   }

//   // Validate file size (max 5MB)
//   const maxSize = 5 * 1024 * 1024 // 5MB
//   if (file.size > maxSize) {
//     return { url: null, error: 'File too large. Maximum size is 5MB.' }
//   }

//   // Generate unique filename
//   const fileExt = file.name.split('.').pop()
//   const fileName = `${user.id}/${Date.now()}.${fileExt}`

//   // Delete existing avatar if any
//   const { data: existingFiles } = await supabase.storage
//     .from('avatars')
//     .list(user.id)

//   if (existingFiles && existingFiles.length > 0) {
//     const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
//     await supabase.storage.from('avatars').remove(filesToDelete)
//   }

//   // Upload new avatar
//   const { error: uploadError } = await supabase.storage
//     .from('avatars')
//     .upload(fileName, file, {
//       cacheControl: '3600',
//       upsert: true,
//     })

//   if (uploadError) {
//     console.error('Avatar upload error:', uploadError)
//     return { url: null, error: 'Failed to upload avatar. Please try again.' }
//   }

//     const file = formData.get('avatar') as File | null

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
      await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture_url: publicUrl }),
        cache: 'no-store',
      })
    } catch (error) {
      console.error('Failed to update profile with avatar URL:', error)
      // Still return success since file was uploaded
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
      await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture_url: null }),
        cache: 'no-store',
      })
    } catch (error) {
      console.error('Failed to update profile to remove avatar URL:', error)
      // Still return success since file was deleted
    }
  }

  return { success: true, error: null }
}

