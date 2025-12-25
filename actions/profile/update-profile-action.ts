'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ProfileFormState } from '@/lib/types/profile'
import { buildApiUrl } from '@/lib/utils/api-url'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface ProfileUpdateInput {
  fullName?: string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  profilePictureUrl?: string
  interests?: string[]
  bio?: string
  hobbies?: string[]
  distanceRadiusKm?: number
  availability?: Record<string, boolean>
}

/**
 * Update user profile (partial update)
 * 
 * OD-189: Edit profile
 * This function calls the NestJS backend /api/profile PATCH endpoint
 * to update the user's profile data.
 */
export async function updateProfileAction(
  updates: ProfileUpdateInput
): Promise<ProfileFormState> {
  try {
    // Get Supabase session (for access token)
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      return { status: 'error', message: 'You must be logged in to update your profile' }
    }

    // Validate that at least one field is provided
    const hasAtLeastOneField = Object.values(updates).some(
      (value) => value !== undefined && value !== null
    )

    if (!hasAtLeastOneField) {
      return {
        status: 'error',
        message: 'Please provide at least one field to update',
      }
    }

    // Call backend API
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured')
      return {
        status: 'error',
        message: 'Backend URL not configured',
      }
    }

    // Filter out undefined/null values for partial update
    const backendData = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined && value !== null)
    )

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend /api/profile PATCH error:', backendResponse.status, errorText)
        
        if (backendResponse.status === 400) {
          return {
            status: 'error',
            message: errorText || 'Invalid data provided. Please check your input.',
          }
        }
        
        return {
          status: 'error',
          message: 'Failed to update profile. Please try again.',
        }
      }

      // Revalidate the profile page cache
      revalidatePath('/profile')

      return {
        status: 'success',
        message: 'Profile updated successfully!',
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          status: 'error',
          message: 'Request timeout. Please try again.',
        }
      }
      throw fetchError
    }
  } catch (error) {
    console.error('Update profile error:', error)
    return {
      status: 'error',
      message: 'Failed to update profile. Please try again.',
    }
  }
}

