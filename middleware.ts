import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/feed', '/settings', '/activities', '/profile']

// Routes that should redirect to feed if already authenticated with complete profile
const AUTH_ROUTES = ['/login', '/']

// Routes that are always public
const PUBLIC_ROUTES = ['/auth/callback', '/onboarding']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams

  // Handle magic link code - redirect to auth/callback if code exists on any route
  const code = searchParams.get('code')
  if (code && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    // Keep the code parameter
    return NextResponse.redirect(url)
  }

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Check if current route is an auth route (login, home)
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Check if current route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))

  // If no user and trying to access protected route, redirect to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user exists, check profile completion for routing
  if (user) {
    // Get profile completion status
    // Note: This will return null if table doesn't exist or no profile found
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('profile_completed')
      .eq('user_id', user.id)
      .single()

    // If there's an error (like table doesn't exist), treat as incomplete profile
    const profileCompleted = profileError ? false : (profile?.profile_completed ?? false)

    // If user has incomplete profile and is trying to access protected routes
    if (!profileCompleted && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/profile'
      return NextResponse.redirect(url)
    }

    // If user has complete profile and is on auth routes, redirect to feed
    if (profileCompleted && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/feed'
      return NextResponse.redirect(url)
    }

    // If user has incomplete profile and is on home/login, redirect to onboarding
    if (!profileCompleted && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/profile'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - api routes
     * - auth callback route
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

