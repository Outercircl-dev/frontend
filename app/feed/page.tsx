import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, MapPin, Settings, LogOut, CheckCircle, User, Calendar, Heart } from 'lucide-react'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

// Fallback interests mapping for display
const INTEREST_DISPLAY: Record<string, { name: string; icon: string }> = {
  running: { name: 'Running', icon: '🏃' },
  cycling: { name: 'Cycling', icon: '🚴' },
  swimming: { name: 'Swimming', icon: '🏊' },
  hiking: { name: 'Hiking', icon: '🥾' },
  yoga: { name: 'Yoga', icon: '🧘' },
  gym: { name: 'Gym & Fitness', icon: '💪' },
  cold_plunge: { name: 'Cold Plunge', icon: '🧊' },
  coffee: { name: 'Coffee Meetups', icon: '☕' },
  brunch: { name: 'Brunch', icon: '🥂' },
  pub_quiz: { name: 'Pub Quiz', icon: '🍺' },
  board_games: { name: 'Board Games', icon: '🎲' },
  dinner_parties: { name: 'Dinner Parties', icon: '🍽️' },
  art: { name: 'Art', icon: '🎨' },
  photography: { name: 'Photography', icon: '📷' },
  music: { name: 'Music', icon: '🎵' },
  writing: { name: 'Writing', icon: '✍️' },
  crafts: { name: 'Crafts', icon: '🧶' },
  book_club: { name: 'Book Club', icon: '📚' },
  languages: { name: 'Languages', icon: '🗣️' },
  tech: { name: 'Tech & Gadgets', icon: '💻' },
  coding: { name: 'Coding', icon: '👨‍💻' },
  business: { name: 'Business', icon: '💼' },
  walking: { name: 'Walking', icon: '🚶' },
  gardening: { name: 'Gardening', icon: '🌱' },
  beach: { name: 'Beach', icon: '🏖️' },
  camping: { name: 'Camping', icon: '⛺' },
  nature: { name: 'Nature Walks', icon: '🌿' },
  meditation: { name: 'Meditation', icon: '🧘' },
  mindfulness: { name: 'Mindfulness', icon: '🙏' },
  cooking: { name: 'Cooking', icon: '🍳' },
  nutrition: { name: 'Nutrition', icon: '🥗' },
}

export default async function FeedPage() {
  const supabase = createServerActionClient(await cookies())

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile - handle case where table doesn't exist
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no profile or error, redirect to onboarding
  if (profileError || !profile) {
    console.log('Feed: No profile found, redirecting to onboarding. Error:', profileError?.message)
    redirect('/onboarding/profile')
  }

  // If profile is not complete, redirect to onboarding
  if (!profile.profile_completed) {
    redirect('/onboarding/profile')
  }

  // Get interests display data (use fallback if database doesn't have interests table)
  const interestDisplayData = (profile.interests || []).map((slug: string) => {
    const display = INTEREST_DISPLAY[slug]
    return display || { name: slug, icon: '⭐' }
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatAvailability = (availability: Record<string, boolean> | null) => {
    if (!availability) return []
    const labels: Record<string, string> = {
      weekday_morning: 'Weekday Mornings',
      weekday_afternoon: 'Weekday Afternoons',
      weekday_evening: 'Weekday Evenings',
      weekend_anytime: 'Weekend Anytime',
    }
    return Object.entries(availability)
      .filter(([, value]) => value)
      .map(([key]) => labels[key] || key)
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/feed" className="flex items-center gap-2">
            <Image src="/logo.png" alt="OuterCircl" width={120} height={32} style={{ width: 'auto', height: '32px' }} />
          </Link>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            <form action="/api/v1/auth/signout" method="POST">
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
            <div className="relative h-9 w-9 overflow-hidden rounded-full">
              {profile.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt={profile.full_name}
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-xs font-medium">
                  {getInitials(profile.full_name)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">
                Welcome, {profile.full_name.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground">
                Your profile is complete. Discover activities that match your interests.
              </p>
            </div>

            {/* Success Banner */}
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">🎉 Profile Complete!</p>
                  <p className="text-sm text-emerald-600">
                    All your data has been saved successfully to the database.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile Data Verification Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Saved Profile Data
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  This shows all the data saved in Supabase from your onboarding.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Basic Information
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-medium">{profile.full_name}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{formatDate(profile.date_of_birth)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{profile.gender?.replace('_', ' ')}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">User ID (Supabase)</p>
                      <p className="font-mono text-xs">{profile.user_id}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bio */}
                {profile.bio && (
                  <>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Bio
                      </h4>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm">{profile.bio}</p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Interests */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Heart className="mr-1 inline h-4 w-4" />
                    Selected Interests ({profile.interests?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {interestDisplayData.map((interest: { name: string; icon: string }, index: number) => (
                      <Badge key={index} variant="secondary" className="gap-1 text-sm">
                        <span>{interest.icon}</span>
                        {interest.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Raw data: [{profile.interests?.join(', ')}]
                  </p>
                </div>

                <Separator />

                {/* Preferences */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Preferences
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Activity Distance</p>
                      <p className="font-medium">{profile.distance_radius_km} km</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Availability</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formatAvailability(profile.availability).length > 0 ? (
                          formatAvailability(profile.availability).map((slot) => (
                            <Badge key={slot} variant="outline" className="text-xs">
                              {slot}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Not specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Compliance */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Compliance & Timestamps
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Terms of Service</p>
                      <p className="font-medium">
                        {profile.accepted_tos ? '✅ Accepted' : '❌ Not accepted'}
                      </p>
                      {profile.accepted_tos_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(profile.accepted_tos_at)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Community Guidelines</p>
                      <p className="font-medium">
                        {profile.accepted_guidelines ? '✅ Accepted' : '❌ Not accepted'}
                      </p>
                      {profile.accepted_guidelines_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(profile.accepted_guidelines_at)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Profile Created</p>
                      <p className="text-sm">{formatDate(profile.created_at)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm">{formatDate(profile.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Upcoming Activities
                  </span>
                  <Badge variant="secondary">Coming Soon</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <div className="space-y-3">
                        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                        <div className="h-4 w-full rounded bg-muted animate-pulse" />
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            <span className="h-4 w-16 rounded bg-muted animate-pulse" />
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="h-4 w-20 rounded bg-muted animate-pulse" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Activity discovery is coming soon. Check back later!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-background shadow-lg">
                    {profile.profile_picture_url ? (
                      <Image
                        src={profile.profile_picture_url}
                        alt={profile.full_name}
                        fill
                        className="object-cover"
                        sizes="96px"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-medium text-muted-foreground">
                        {getInitials(profile.full_name)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{profile.full_name}</h3>
                  {profile.bio && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{profile.bio}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Within {profile.distance_radius_km}km</span>
                  </div>
                  <Badge variant="outline" className="mt-3">
                    {profile.is_verified ? '✅ Verified Host' : '👤 Member'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interests Summary */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">Your Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {interestDisplayData.slice(0, 6).map((interest: { name: string; icon: string }, index: number) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      <span>{interest.icon}</span>
                      {interest.name}
                    </Badge>
                  ))}
                  {interestDisplayData.length > 6 && (
                    <Badge variant="outline">+{interestDisplayData.length - 6} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold">Your Activity</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground">Activities Joined</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-muted-foreground">Connections Made</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}
