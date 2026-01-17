'use client'

import Image from 'next/image'
import Link from 'next/link'
import { use, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock, LogOut, MapPin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuthState } from '@/hooks/useAuthState'
import { useParticipation } from '@/hooks/useParticipation'
import type { ParticipationState } from '@/lib/types/activity'

const statusCopy: Record<ParticipationState | 'not_joined', string> = {
    not_joined: 'You have not joined this activity yet.',
    pending: 'Awaiting host approval.',
    confirmed: 'You are confirmed for this activity.',
    waitlisted: 'You are currently on the waitlist.',
}

export default function ActivityDetailPage({ params }: { params: Promise<{ activityId: string }> }) {
    const { activityId } = use(params)
    const { activity, isLoading, error, join, cancel } = useParticipation(activityId)
    const { user } = useAuthState()
    const [joinMessage, setJoinMessage] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const viewerStatus: ParticipationState | 'not_joined' = activity?.viewerParticipation?.status ?? 'not_joined'
    const isHost = user?.supabaseUserId && activity?.hostId === user.supabaseUserId

    const locationLabel = activity?.meetingPointHidden
        ? 'Join to reveal exact meeting point'
        : activity?.location?.address ?? 'Unknown location'

    const canJoin = !isHost && viewerStatus === 'not_joined'
    const canCancel = !isHost && ['confirmed', 'pending', 'waitlisted'].includes(viewerStatus)

    const waitlistPosition = activity?.viewerParticipation?.waitlistPosition

    const handleJoin = async () => {
        try {
            setIsSubmitting(true)
            setActionError(null)
            await join(activity?.isPublic ? {} : { message: joinMessage || undefined })
            setJoinMessage('')
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to join activity')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = async () => {
        try {
            setIsSubmitting(true)
            setActionError(null)
            await cancel()
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to cancel participation')
        } finally {
            setIsSubmitting(false)
        }
    }

    const participationDescription = useMemo(() => {
        if (isHost) {
            return 'You are hosting this activity.'
        }
        let copy = statusCopy[viewerStatus]
        if (viewerStatus === 'waitlisted' && waitlistPosition) {
            copy = `${copy} Position #${waitlistPosition}.`
        }
        return copy
    }, [isHost, viewerStatus, waitlistPosition])

    return (
        <div className="min-h-screen bg-muted/40">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link href="/feed" className="flex items-center gap-3">
                        <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Button asChild variant="outline" className="hidden sm:inline-flex">
                            <Link href="/profile">Profile</Link>
                        </Button>
                        <Button asChild variant="outline" className="hidden sm:inline-flex">
                            <Link href="/activities">Activities</Link>
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

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-0">
                {isLoading ? (
                    <Card className="animate-in fade-in duration-500">
                        <CardHeader>
                            <Skeleton className="h-8 w-2/3" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-40 w-full" />
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="border-red-200 bg-red-50 animate-in fade-in duration-500">
                        <CardHeader>
                            <CardTitle className="text-red-700">Unable to load activity</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-red-700/90">{error}</CardContent>
                    </Card>
                ) : activity ? (
                    <>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" asChild className="gap-2">
                                <Link href="/feed">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to feed
                                </Link>
                            </Button>
                            <span className="text-sm text-muted-foreground">Keep exploring activities after viewing details.</span>
                        </div>
                        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <Badge variant="outline" className="w-fit capitalize">
                                        {activity.status}
                                    </Badge>
                                    <CardTitle className="text-3xl">{activity.title}</CardTitle>
                                    <p className="text-muted-foreground">{activity.description}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        <span className="text-foreground">{activity.activityDate}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-foreground">
                                            {activity.startTime} – {activity.endTime}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-foreground">{locationLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span className="text-foreground">
                                            {activity.currentParticipants} / {activity.maxParticipants} going (waitlist {activity.waitlistCount})
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm font-medium text-foreground">
                                            Participation status
                                        </div>
                                        <p className="text-sm text-muted-foreground">{participationDescription}</p>
                                        {actionError ? (
                                            <p className="text-sm text-red-600">{actionError}</p>
                                        ) : null}
                                    </div>

                                    {!isHost ? (
                                        <div className="space-y-3">
                                            {!activity.isPublic ? (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-foreground" htmlFor="join-message">
                                                        Message to host
                                                    </label>
                                                    <Textarea
                                                        id="join-message"
                                                        placeholder="Share a short note with the host"
                                                        value={joinMessage}
                                                        onChange={(event) => setJoinMessage(event.target.value)}
                                                    />
                                                </div>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                                <Button onClick={handleJoin} disabled={!canJoin || isSubmitting}>
                                                    {viewerStatus === 'not_joined'
                                                        ? activity.isPublic
                                                            ? 'Join activity'
                                                            : 'Request to join'
                                                        : 'Join request sent'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={handleCancel}
                                                    disabled={!canCancel || isSubmitting}
                                                >
                                                    Cancel participation
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground">
                                            You are the host. Manage participants on the{' '}
                                            <Link href={`/host/activities/${activity.id}/participants`} className="text-primary underline">
                                                roster page
                                            </Link>
                                            .
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </main>
        </div>
    )
}

