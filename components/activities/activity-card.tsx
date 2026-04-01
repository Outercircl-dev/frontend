// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { CalendarDays, Clock, Globe, Lock, MapPin, UserCircle2, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { fetchJson } from '@/lib/api/fetch-json'
import {
  DEFAULT_ACTIVITY_IMAGE,
  getActivityImageForCategory,
  getCategoryImageAttribution,
} from '@/lib/activity-categories'
import { genderRestrictionReason, meetsGenderRestriction } from '@/lib/activity-gender-restriction'
import type { Activity } from '@/lib/types/activity'
import type { Gender } from '@/lib/types/profile'
import { hasActivityStarted } from '@/src/utils/activityDateTime'

function formatDate(dateString: string) {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(dateString: string, timeString: string) {
  const [hours, minutes] = (timeString ?? '').split(':')
  if (!hours || !minutes) return timeString
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

function titleCase(value: string | null | undefined, fallback = '') {
  if (!value) return fallback
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function restrictionLabel(restriction: 'none' | 'men_only' | 'women_only' | 'other_only') {
  if (restriction === 'men_only') return 'Men only'
  if (restriction === 'women_only') return 'Women only'
  if (restriction === 'other_only') return 'Other only'
  return 'Open'
}

function recurrenceLabel(activity: Activity) {
  if (!activity.recurrence) return null
  if (activity.recurrence.frequency === 'weekly' && activity.recurrence.weekdays?.length) {
    const days = activity.recurrence.weekdays
      .map((weekday) => weekday.slice(0, 1).toUpperCase() + weekday.slice(1, 3))
      .join(', ')
    return `Weekly on ${days}`
  }
  return 'Daily'
}

export function ActivityCard({
  activity,
  viewerId,
  viewerGender,
  clickHref,
  onActivityUpdated,
}: {
  activity: Activity
  viewerId?: string | null
  viewerGender?: Gender | null
  clickHref?: string
  onActivityUpdated?: (activity: Activity) => void
}) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(false)
  const total = Math.max(0, activity.maxParticipants ?? 0)
  const current = Math.max(1, activity.currentParticipants ?? 0)
  const ratio = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  const spotsLeft = total > 0 ? Math.max(0, total - current) : null
  const locationLabel = activity.meetingPointHidden
    ? activity.location?.address ?? 'Nearby area'
    : activity.location?.address ?? 'Unknown location'
  const isHost = Boolean(viewerId && activity.hostId === viewerId)
  const hasStarted = hasActivityStarted(activity.activityDate, activity.startTime)
  const participationStatus = activity.viewerParticipation?.status ?? 'not_joined'
  const resolvedImage = getActivityImageForCategory(activity.category, activity.imageUrl)
  const attribution = getCategoryImageAttribution(resolvedImage.category)
  const [activityImageUrl, setActivityImageUrl] = useState(resolvedImage.src)
  const [showDefaultAttribution, setShowDefaultAttribution] = useState(resolvedImage.isDefault)
  const hostLabel = activity.hostName || activity.hostUsername || activity.hostId.slice(0, 8)
  const targetHref = clickHref ?? `/activities/${activity.id}`
  const canJoinByGender = meetsGenderRestriction(activity.genderRestriction, viewerGender ?? null)
  const genderJoinReason =
    participationStatus === 'not_joined' && !isHost && !canJoinByGender
      ? genderRestrictionReason(activity.genderRestriction)
      : null
  const canJoin =
    Boolean(viewerId) &&
    !isHost &&
    activity.status === 'published' &&
    !hasStarted &&
    participationStatus === 'not_joined' &&
    canJoinByGender
  const joinButtonLabel = useMemo(() => {
    if (isHost) return 'Host'
    if (participationStatus === 'confirmed') return 'Joined'
    if (participationStatus === 'pending') return 'Request Pending'
    if (participationStatus === 'waitlisted') return 'Waitlisted'
    return 'Join Activity'
  }, [isHost, participationStatus])

  useEffect(() => {
    setActivityImageUrl(resolvedImage.src)
    setShowDefaultAttribution(resolvedImage.isDefault)
  }, [resolvedImage.isDefault, resolvedImage.src])

  const handleCardClick = () => {
    router.push(targetHref)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      router.push(targetHref)
    }
  }

  const handleJoin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!canJoin || isJoining) {
      return
    }

    try {
      setIsJoining(true)
      const data = await fetchJson<{ activity: Activity }>(
        `/rpc/v1/activities/${activity.id}/participants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        'Failed to join activity',
      )
      onActivityUpdated?.(data.activity)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`group overflow-hidden border-muted/70 bg-background transition hover:-translate-y-0.5 hover:shadow-md ${
        targetHref ? 'cursor-pointer' : ''
      }`}
    >
      <div className="aspect-video w-full overflow-hidden border-b bg-muted/40">
        <img
          src={activityImageUrl}
          alt={`${activity.title} cover image`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={() => {
            if (activityImageUrl !== DEFAULT_ACTIVITY_IMAGE) {
              setActivityImageUrl(DEFAULT_ACTIVITY_IMAGE)
            }
            setShowDefaultAttribution(false)
          }}
        />
        {showDefaultAttribution && attribution ? (
          <p className="px-3 py-1 text-[11px] text-muted-foreground/80">
            Photo by{' '}
            <a
              href={attribution.photographerUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {attribution.photographerName}
            </a>{' '}
            on{' '}
            <a
              href={attribution.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {attribution.sourceName}
            </a>
          </p>
        ) : null}
      </div>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="line-clamp-1 text-lg">{activity.title}</CardTitle>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{activity.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {titleCase(activity.category, 'Unknown')}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activity.status !== 'published' ? (
            <Badge variant="outline" className="capitalize">
              {activity.status}
            </Badge>
          ) : null}
          {isHost ? (
            <Badge variant="secondary" className="gap-1">
              Host tools
            </Badge>
          ) : null}
          <Badge variant="outline" className="gap-1">
            {activity.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {activity.isPublic ? 'Public' : 'Private'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {restrictionLabel(activity.genderRestriction)}
          </Badge>
          <Badge variant="outline" className="ml-1 gap-1 border-primary/40 bg-primary/10 text-xs text-primary">
            <UserCircle2 className="h-3.5 w-3.5" />
            Host {hostLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="text-foreground">{formatDate(activity.activityDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-foreground">
              {formatTime(activity.activityDate, activity.startTime)} – {formatTime(activity.activityDate, activity.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1 text-foreground">{locationLabel}</span>
          </div>
          {activity.recurrence ? (
            <div className="sm:col-span-2">
              <span className="text-foreground">{recurrenceLabel(activity)}</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <span className="font-medium text-foreground">{current}</span> / {total} going
              </span>
            </span>
            {spotsLeft !== null ? (
              <span className="text-xs text-muted-foreground">
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
              </span>
            ) : null}
          </div>
          <Progress value={ratio} />
        </div>

        {activity.interests?.length ? (
          <div className="flex flex-wrap gap-2">
            {activity.interests.slice(0, 8).map((interest) => (
              <Badge key={interest} variant="secondary" className="bg-muted/60">
                {titleCase(interest)}
              </Badge>
            ))}
            {activity.interests.length > 8 ? (
              <Badge variant="outline">+{activity.interests.length - 8} more</Badge>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No interests tagged.</p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Waitlist:{' '}
            <span className="font-medium text-foreground">{activity.waitlistCount ?? 0}</span>
          </span>
          <Button size="sm" onClick={handleJoin} disabled={!canJoin || isJoining}>
            {isJoining ? 'Joining...' : joinButtonLabel}
          </Button>
        </div>
        {genderJoinReason ? <p className="text-xs text-amber-700">{genderJoinReason}</p> : null}
      </CardContent>
    </Card>
  )
}


