'use server'

import { cookies } from 'next/headers'
import type { UserProfile } from '@/lib/types/profile'

export interface GetProfileResult {
  profile: UserProfile | null
  error: string | null
}

// export async function getProfileAction(): Promise<GetProfileResult> {
//   const cookieStore = await cookies()
//   const supabase = createServerActionClient(cookieStore)

//   // Get current user
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser()

//   if (authError || !user) {
//     return { profile: null, error: 'Not authenticated' }
//   }

//   // Fetch profile
//   const { data, error } = await supabase
//     .from('user_profiles')
//     .select('*')
//     .eq('user_id', user.id)
//     .single()

//   // PGRST116 means no rows found - not an error for us
//   if (error && error.code !== 'PGRST116') {
//     console.error('Get profile error:', error)
//     return { profile: null, error: error.message }
//   }

//   return { profile: data, error: null }
// }

// export async function checkProfileCompleted(): Promise<boolean> {
//   const { profile } = await getProfileAction()
//   return profile?.profile_completed ?? false
// }

