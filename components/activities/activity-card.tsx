import Link from 'next/link'

import { CalendarDays, Clock, Globe, Lock, MapPin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/lib/types/activity'

function formatDate(dateString: string) {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(dateString: string, timeString: string) {
  // Treat as local time for display; backend provides date + time separately.
  const dt = new Date(`${dateString}T${timeString}`)
  if (Number.isNaN(dt.getTime())) return timeString
  return dt.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function ActivityCard({ activity, viewerId }: { activity: Activity; viewerId?: string | null }) {
  const total = Math.max(0, activity.maxParticipants ?? 0)
  const current = Math.max(0, activity.currentParticipants ?? 0)
  const ratio = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  const spotsLeft = total > 0 ? Math.max(0, total - current) : null
  const locationLabel =
    activity.meetingPointHidden && activity.location?.address
      ? 'Join to reveal exact meeting point'
      : activity.location?.address ?? 'Unknown location'
  const isHost = Boolean(viewerId && activity.hostId === viewerId)

  return (
    <Card className="group overflow-hidden border-muted/70 bg-background transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="line-clamp-1 text-lg">{activity.title}</CardTitle>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{activity.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {titleCase(activity.category)}
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
          <Badge variant="outline" className="font-mono text-xs">
            Host {activity.hostId.slice(0, 8)}
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
          <Button asChild variant="link" className="h-auto px-0 text-primary">
            <Link href={`/activities/${activity.id}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


