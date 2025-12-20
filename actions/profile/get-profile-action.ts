'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/profile'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface GetProfileResult {
  profile: UserProfile | null
  error: string | null
}

export async function getProfileAction(): Promise<GetProfileResult> {
  try {
    // Get Supabase session (for access token) - this is server-side, not direct client communication
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      return { profile: null, error: 'Not authenticated' }
    }

    // Call backend API directly (following architecture pattern)
    if (!API_URL) {
      console.error('NEXT_PUBLIC_API_URL is not configured for profile fetch')
      return { profile: null, error: 'Backend URL not configured' }
    }

    const backendResponse = await fetch(`${API_URL}/api/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!backendResponse.ok) {
      if (backendResponse.status === 401) {
        return { profile: null, error: 'Not authenticated' }
      }
      if (backendResponse.status === 404) {
        // Profile doesn't exist yet - not an error
        return { profile: null, error: null }
      }
      const errorText = await backendResponse.text()
      console.error('Backend /api/profile error:', backendResponse.status, errorText)
      return { profile: null, error: 'Failed to fetch profile from backend' }
    }

    const profileData = await backendResponse.json()
    return { profile: profileData, error: null }
  } catch (error) {
    console.error('Get profile error:', error)
    return { profile: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function checkProfileCompleted(): Promise<boolean> {
  const { profile } = await getProfileAction()
  return profile?.profile_completed ?? false
}

