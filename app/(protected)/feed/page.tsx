'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, LogOut, Search, SlidersHorizontal } from 'lucide-react'

import { ActivityCard } from '@/components/activities/activity-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthState } from '@/hooks/useAuthState'
import type { ActivitiesResponse, Activity } from '@/lib/types/activity'

const DEFAULT_LIMIT = 20

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export default function FeedPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [raw, setRaw] = useState<ActivitiesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<'soonest' | 'newest'>('soonest')
  const { user } = useAuthState()

  useEffect(() => {
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

  const categories = useMemo(() => {
    const items = raw?.items ?? []
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.category) set.add(item.category)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [raw])

  const filteredItems = useMemo(() => {
    const items = (raw?.items ?? []).slice()
    const q = normalize(query)

    const matchesQuery = (a: Activity) => {
      if (!q) return true
      const haystack = [
        a.title,
        a.description,
        a.category,
        a.location?.address ?? '',
        ...(a.interests ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    }

    const matchesCategory = (a: Activity) => (category === 'all' ? true : a.category === category)

    const parsedDate = (a: Activity) => {
      const dt = new Date(`${a.activityDate}T${a.startTime}`)
      return Number.isNaN(dt.getTime()) ? 0 : dt.getTime()
    }

    const parsedCreated = (a: Activity) => {
      const dt = new Date(a.createdAt)
      return Number.isNaN(dt.getTime()) ? 0 : dt.getTime()
    }

    const visible = items.filter((a) => matchesQuery(a) && matchesCategory(a))

    visible.sort((a, b) => {
      if (sort === 'newest') return parsedCreated(b) - parsedCreated(a)
      return parsedDate(a) - parsedDate(b)
    })

    return visible
  }, [raw, query, category, sort])

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/feed" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/activities">My activities</Link>
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Your Feed</h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_220px_180px_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, location, interests…"
                className="pl-9"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as 'soonest' | 'newest')}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soonest">Soonest</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 40, 60].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <Card className="border-red-200/70 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Couldn&apos;t load activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-red-700/90">
              <pre className="whitespace-pre-wrap rounded-lg bg-white/60 p-3 text-xs text-red-700">
                {error}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPage((p) => p)} variant="outline">
                  Retry
                </Button>
                <Button asChild variant="outline">
                  <Link href="/profile">Go to profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : raw && filteredItems.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No activities found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Try clearing your search or switching the category filter.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setQuery('')}>
                  Clear search
                </Button>
                <Button variant="outline" onClick={() => setCategory('all')}>
                  All categories
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div>
                Showing <span className="font-medium text-foreground">{filteredItems.length}</span>
                {raw ? (
                  <>
                    {' '}
                    of <span className="font-medium text-foreground">{raw.items.length}</span> on this page
                  </>
                ) : null}
              </div>
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} viewerId={user?.supabaseUserId} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


