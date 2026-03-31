// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, ClipboardList } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Activity, ActivitiesResponse } from '@/lib/types/activity'
import { fetchJson } from '@/lib/api/fetch-json'
import { hasActivityStarted } from '@/src/utils/activityDateTime'

interface ParticipantSummary {
  id: string
  status: 'confirmed' | 'pending' | 'waitlisted' | 'cancelled'
}

interface PendingApprovalItem {
  activityId: string
  activityTitle: string
  pendingCount: number
}

export function ProfileSchedulingSection({ viewerUserId }: { viewerUserId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const activityData = await fetchJson<ActivitiesResponse>(
          '/rpc/v1/activities?page=1&limit=100',
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          'Failed to load activities',
        )
        if (cancelled) {
          return
        }

        const allActivities = activityData.items ?? []
        setActivities(allActivities)

        const hostedActivities = allActivities.filter(
          (activity) =>
            activity.hostId === viewerUserId &&
            activity.status !== 'cancelled' &&
            activity.status !== 'completed' &&
            !hasActivityStarted(activity.activityDate, activity.startTime),
        )

        const pendingByActivity = await Promise.all(
          hostedActivities.map(async (activity) => {
            const roster = await fetchJson<{ participants: ParticipantSummary[] }>(
              `/rpc/v1/activities/${activity.id}/participants`,
              { method: 'GET', headers: { 'Content-Type': 'application/json' } },
              'Failed to load participant requests',
            )
            const pendingCount = (roster.participants ?? []).filter(
              (participant) => participant.status === 'pending',
            ).length
            return {
              activityId: activity.id,
              activityTitle: activity.title,
              pendingCount,
            }
          }),
        )

        if (cancelled) {
          return
        }
        setPendingApprovals(pendingByActivity.filter((item) => item.pendingCount > 0))
      } catch {
        if (!cancelled) {
          setError('Unable to load scheduling and approval details right now.')
          setActivities([])
          setPendingApprovals([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [viewerUserId])

  const scheduledActivities = useMemo(
    () =>
      activities.filter((activity) => {
        if (activity.status === 'cancelled' || activity.status === 'completed') {
          return false
        }
        if (hasActivityStarted(activity.activityDate, activity.startTime)) {
          return false
        }
        const viewerStatus = activity.viewerParticipation?.status
        const isAttending = Boolean(viewerStatus && viewerStatus !== 'not_joined')
        const isHosting = activity.hostId === viewerUserId
        return isAttending || isHosting
      }),
    [activities, viewerUserId],
  )

  return (
    <Card className="border-muted/70">
      <CardHeader>
        <CardTitle className="text-lg">Scheduling and approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading schedule...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-medium">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Scheduled activities
                </p>
                <Badge variant="secondary">{scheduledActivities.length}</Badge>
              </div>
              {scheduledActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming activities scheduled yet.</p>
              ) : (
                <div className="space-y-2">
                  {scheduledActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <p className="truncate text-sm font-medium">{activity.title}</p>
                      <Link href={`/activities/${activity.id}`} className="text-xs text-primary hover:underline">
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-medium">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Pending approval requests
                </p>
                <Badge variant="secondary">
                  {pendingApprovals.reduce((sum, item) => sum + item.pendingCount, 0)}
                </Badge>
              </div>
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending join requests to review.</p>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.map((item) => (
                    <div key={item.activityId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.activityTitle}</p>
                        <p className="text-xs text-muted-foreground">{item.pendingCount} pending</p>
                      </div>
                      <Link
                        href={`/host/activities/${item.activityId}/participants`}
                        className="text-xs text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

