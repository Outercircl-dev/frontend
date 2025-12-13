'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@/lib/supabase/server'

export interface UploadAvatarResult {
  url: string | null
  error: string | null
}

// export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarResult> {
//   const supabase = createServerActionClient(await cookies())

//   // Get current user
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser()

//   if (authError || !user) {
//     return { url: null, error: 'You must be logged in to upload an avatar' }
//   }

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

//   // Get public URL
//   const {
//     data: { publicUrl },
//   } = supabase.storage.from('avatars').getPublicUrl(fileName)

//   // Update user profile with new avatar URL
//   await supabase
//     .from('user_profiles')
//     .update({ profile_picture_url: publicUrl })
//     .eq('user_id', user.id)

//   return { url: publicUrl, error: null }
// }

// export async function deleteAvatarAction(): Promise<{ success: boolean; error: string | null }> {
//   const supabase = createServerActionClient(await cookies())

//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser()

//   if (authError || !user) {
//     return { success: false, error: 'You must be logged in' }
//   }

//   // Delete all files in user's avatar folder
//   const { data: existingFiles } = await supabase.storage
//     .from('avatars')
//     .list(user.id)

//   if (existingFiles && existingFiles.length > 0) {
//     const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
//     const { error } = await supabase.storage.from('avatars').remove(filesToDelete)

//     if (error) {
//       console.error('Delete avatar error:', error)
//       return { success: false, error: 'Failed to delete avatar' }
//     }
//   }

//   // Clear profile picture URL
//   await supabase
//     .from('user_profiles')
//     .update({ profile_picture_url: null })
//     .eq('user_id', user.id)

//   return { success: true, error: null }
// }

