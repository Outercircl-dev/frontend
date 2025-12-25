'use server'

import { revalidatePath } from 'next/cache'
import { redirect, isRedirectError } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ProfileFormState } from '@/lib/types/profile'
import { buildApiUrl } from '@/lib/utils/api-url'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Delete user profile
 * 
 * OD-190: Delete profile
 * This function calls the NestJS backend /api/profile DELETE endpoint
 * to delete the user's profile and redirects to onboarding.
 */
export async function deleteProfileAction(): Promise<ProfileFormState> {
  try {
    // Get Supabase session (for access token)
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      return { status: 'error', message: 'You must be logged in to delete your profile' }
    }

    // Call backend API
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured')
      return {
        status: 'error',
        message: 'Backend URL not configured',
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const backendResponse = await fetch(buildApiUrl(API_URL, 'profile'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend /api/profile DELETE error:', backendResponse.status, errorText)
        
        if (backendResponse.status === 404) {
          return {
            status: 'error',
            message: 'Profile not found',
          }
        }
        
        return {
          status: 'error',
          message: 'Failed to delete profile. Please try again.',
        }
      }

      // Revalidate paths
      revalidatePath('/profile')
      revalidatePath('/onboarding/profile')

      // Redirect to onboarding after successful deletion
      redirect('/onboarding/profile')
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
    // If redirect was thrown, re-throw it
    if (isRedirectError(error)) {
      throw error
    }
    
    console.error('Delete profile error:', error)
    return {
      status: 'error',
      message: 'Failed to delete profile. Please try again.',
    }
  }
}

