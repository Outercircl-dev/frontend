import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  // Default redirect destination
  let redirectUrl = new URL('/onboarding/profile', request.url)

  // Create temporary response to capture cookies during session exchange
  const tempResponse = NextResponse.next()

  // Create Supabase client that sets cookies on tempResponse
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            tempResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange the code for a session
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
  }
  console.log('data', data.session)

  // Check if user has completed profile to determine redirect
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('profile_completed')
      .eq('user_id', user.id)
      .single()

    if (!profileError && profile?.profile_completed) {
      redirectUrl = new URL('/feed', request.url)
    }
  }

  // Create final redirect response and copy session cookies to it
  const finalResponse = NextResponse.redirect(redirectUrl)
  
  tempResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })
  })

  return finalResponse
}

