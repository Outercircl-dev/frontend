'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, LogOut, MapPin, Search } from 'lucide-react'

import { ActivityCard } from '@/components/activities/activity-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AdSlot } from '@/components/membership/AdSlot'
import { UpgradeHint } from '@/components/membership/UpgradeHint'
import { useAuthState } from '@/hooks/useAuthState'
import type { ActivitiesResponse, Activity } from '@/lib/types/activity'

const DEFAULT_LIMIT = 20

export default function ActivitiesPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(DEFAULT_LIMIT)
  const [raw, setRaw] = useState<ActivitiesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const { user } = useAuthState()
  const showAds = Boolean(user?.tierRules?.ads?.showsAds)
  const groupsEnabled = user?.tierRules?.groups?.enabled ?? false
  const requiresVerifiedHost = Boolean(user?.tierRules?.verification?.requiresVerifiedHostForHosting)
  const isVerifiedHost = user?.role === 'authenticated'
  const canHost = !requiresVerifiedHost || isVerifiedHost

  const fetchActivities = useCallback(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))

        const res = await fetch(`/rpc/v1/activities?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Request failed (${res.status})`)
        }

        const data = (await res.json()) as ActivitiesResponse
        if (!cancelled) setRaw(data)
      } catch (e) {
        if (cancelled) return
        setRaw(null)
        setError(e instanceof Error ? e.message : 'Failed to load activities')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [page, limit])

  useEffect(() => {
    return fetchActivities()
  }, [fetchActivities])

  const normalizedQuery = query.trim().toLowerCase()
  const allItems = useMemo(() => {
    const source = raw?.items ?? []
    if (!normalizedQuery) return source
    return source.filter((activity) => {
      const haystack = [
        activity.title,
        activity.description,
        activity.category,
        activity.location?.address ?? '',
        ...(activity.interests ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [raw, normalizedQuery])

  const myActivities = useMemo(() => {
    if (!user?.supabaseUserId) return []
    return allItems.filter((activity) => {
      const isHost = activity.hostId === user.supabaseUserId
      const status = activity.viewerParticipation?.status
      const isParticipant = Boolean(status && status !== 'not_joined')
      return isHost || isParticipant
    })
  }, [allItems, user])

  const upcomingActivities = useMemo(() => {
    if (!user?.supabaseUserId) return allItems
    const mine = new Set(myActivities.map((activity) => activity.id))
    return allItems.filter((activity) => !mine.has(activity.id))
  }, [allItems, myActivities, user])

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/feed" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/feed">Discover</Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/profile">Profile</Link>
            </Button>
            <form action="/rpc/v1/auth/signout" method="POST">
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">My Activities</h1>
            <p className="text-sm text-muted-foreground">Everything you host or are attending, plus what’s trending.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col items-start gap-1">
              {canHost ? (
                <Button asChild variant="outline">
                  <Link href="/activities/new">Create activity</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled className="opacity-60">
                  Create activity
                </Button>
              )}
              {!canHost ? <UpgradeHint message="Hosting requires a verified plan." className="text-xs" /> : null}
            </div>
            <div className="flex flex-col items-start gap-1">
              {groupsEnabled ? (
                <Button asChild variant="outline">
                  <Link href="/activities/groups">Groups</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled className="opacity-60">
                  Groups
                </Button>
              )}
              {!groupsEnabled ? <UpgradeHint message="Groups are available on higher tiers." className="text-xs" /> : null}
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your activities…"
              className="pl-9"
            />
          </div>
        </div>
        {showAds ? <AdSlot /> : null}

        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <Card className="border-red-200/70 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <ArrowLeft className="h-4 w-4" />
                Couldn&apos;t load activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-red-700/90">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/70 p-3 text-xs text-red-700">
                {error}
              </pre>
              <Button
                onClick={() => {
                  if (page !== 1) setPage(1)
                  else fetchActivities()
                }}
                variant="outline"
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="space-y-3 rounded-xl border bg-background/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">You're part of these</h2>
                  <p className="text-sm text-muted-foreground">
                    Quick actions for activities you host or have joined.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {myActivities.length} active
                </Badge>
              </div>
              {myActivities.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <CalendarDays className="h-5 w-5" />
                    You haven&apos;t joined or hosted an activity yet. Explore the feed to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myActivities.map((activity) => (
                    <ActivityCard
                      key={`mine-${activity.id}`}
                      activity={activity}
                      viewerId={user?.supabaseUserId}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Discover more</h2>
                <span className="text-sm text-muted-foreground">{upcomingActivities.length} results</span>
              </div>
              {upcomingActivities.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Nothing new matches your search right now.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingActivities.map((activity) => (
                    <ActivityCard
                      key={`discover-${activity.id}`}
                      activity={activity}
                      viewerId={user?.supabaseUserId}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Page <span className="font-medium text-foreground">{page}</span> of{' '}
                <span className="font-medium text-foreground">{raw?.totalPages ?? 1}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => (raw ? Math.min(raw.totalPages, p + 1) : p + 1))}
                  disabled={Boolean(raw && page >= raw.totalPages) || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

