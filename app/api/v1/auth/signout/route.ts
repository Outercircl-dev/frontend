import { createClient, type SupabaseCookie } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const responseCookies: SupabaseCookie[] = []
  const supabase = createClient({
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach((cookie) => responseCookies.push(cookie))
    },
  })

  const { error } = await supabase.auth.signOut()

  if (error) {
    const jsonResponse = NextResponse.json({ error: error.message }, { status: 500 })
    responseCookies.forEach(({ name, value, options }) => jsonResponse.cookies.set(name, value, options))
    return jsonResponse
  }

  const redirectResponse = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    { status: 302 },
  )
  responseCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
  return redirectResponse
}

