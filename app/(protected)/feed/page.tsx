'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'

import { ActivityCard } from '@/components/activities/activity-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AdSlot } from '@/components/membership/AdSlot'
import { ErrorBlock } from '@/components/ui/error-block'
import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { useAuthState } from '@/hooks/useAuthState'
import type { ActivitiesResponse, Activity } from '@/lib/types/activity'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'
import { hasActivityStarted } from '@/src/utils/activityDateTime'

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
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest')
  const { user } = useAuthState()
  const showAds = Boolean(user?.tierRules?.ads?.showsAds)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(limit))

        const data = await fetchJson<ActivitiesResponse>(
          `/rpc/v1/activities?${params.toString()}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          'Failed to load activities',
        )
        if (!cancelled) setRaw(data)
      } catch (e) {
        if (cancelled) return
        setRaw(null)
        setError(getErrorMessage(e, 'Failed to load activities'))
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

    const parsedCreated = (a: Activity) => {
      const dt = new Date(a.createdAt)
      return Number.isNaN(dt.getTime()) ? 0 : dt.getTime()
    }

    const isUpcoming = (a: Activity) => {
      if (a.status === 'completed' || a.status === 'cancelled') return false
      return !hasActivityStarted(a.activityDate, a.startTime)
    }

    const visible = items.filter((a) => isUpcoming(a) && matchesQuery(a) && matchesCategory(a))

    visible.sort((a, b) =>
      sort === 'latest'
        ? parsedCreated(b) - parsedCreated(a)
        : parsedCreated(a) - parsedCreated(b),
    )

    return visible
  }, [raw, query, category, sort])

  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />

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

            <Select value={sort} onValueChange={(v) => setSort(v as 'latest' | 'oldest')}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
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
        {showAds ? <AdSlot /> : null}

        {error ? <ErrorBlock title="Couldn't load activities" message={error} onRetry={() => setPage((p) => p)} /> : null}

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
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  viewerId={user?.supabaseUserId}
                  clickHref={`/activities/${activity.id}`}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


