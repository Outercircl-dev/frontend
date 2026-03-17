'use client'

import Link from 'next/link'
import { use, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock, Lock, MapPin, Pin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorBlock } from '@/components/ui/error-block'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AdSlot } from '@/components/membership/AdSlot'
import { UpgradeHint } from '@/components/membership/UpgradeHint'
import { ActivityLocationMap } from '@/components/activities/activity-location-map'
import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { useAuthState } from '@/hooks/useAuthState'
import { useActivityFeedback } from '@/hooks/useActivityFeedback'
import { useActivityMessages } from '@/hooks/useActivityMessages'
import { useParticipation } from '@/hooks/useParticipation'
import type { ParticipationState } from '@/lib/types/activity'
import { hasActivityStarted } from '@/src/utils/activityDateTime'

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
    const tierRules = user?.tierRules
    const showAds = Boolean(tierRules?.ads?.showsAds)
    const messagingRules = tierRules?.messaging
    const canUseGroupChat = messagingRules?.groupChatEnabled ?? true
    const canUseAutomation = messagingRules?.automatedMessagesEnabled ?? true
    const {
        messages,
        pinned,
        isLoading: messagesLoading,
        error: messagesError,
        postMessage,
        pinMessage,
        reportMessage,
        refetch: refetchMessages,
    } = useActivityMessages(activityId)
    const {
        form: feedbackForm,
        isLoading: feedbackLoading,
        error: feedbackError,
        submitFeedback,
    } = useActivityFeedback(activityId)
    const [joinMessage, setJoinMessage] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [messageText, setMessageText] = useState('')
    const [messageError, setMessageError] = useState<string | null>(null)
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [sendAnnouncement, setSendAnnouncement] = useState(false)
    const [sendPinned, setSendPinned] = useState(false)
    const [activityRating, setActivityRating] = useState<number | null>(null)
    const [activityComment, setActivityComment] = useState('')
    const [consentToAnalysis, setConsentToAnalysis] = useState(false)
    const [participantRatings, setParticipantRatings] = useState<Record<string, { rating: number | null; comment: string }>>({})
    const [feedbackSubmitError, setFeedbackSubmitError] = useState<string | null>(null)
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

    const viewerStatus: ParticipationState | 'not_joined' = activity?.viewerParticipation?.status ?? 'not_joined'
    const isHost = user?.supabaseUserId && activity?.hostId === user.supabaseUserId
    const activityStarted = activity ? hasActivityStarted(activity.activityDate, activity.startTime) : false

    const locationLabel = activity?.meetingPointHidden
        ? 'Approximate area shown. Join to reveal exact meeting point.'
        : activity?.location?.address ?? 'Unknown location'
    const goingCount = Math.max(1, activity?.currentParticipants ?? 0)
    const activityImageUrl = activity?.imageUrl || '/default-activity.svg'

    const canJoin = !isHost && viewerStatus === 'not_joined' && !activityStarted
    const canCancel = !isHost && ['confirmed', 'pending', 'waitlisted'].includes(viewerStatus)

    const waitlistPosition = activity?.viewerParticipation?.waitlistPosition
    const messageAccessDenied = Boolean(
        messagesError &&
            /(not a participant|not participating|participant in this activity|only participants)/i.test(
                messagesError,
            ),
    )
    const messageAccessHint =
        viewerStatus === 'not_joined'
            ? 'Join this activity to view and send group messages.'
            : viewerStatus === 'pending'
                ? 'Messaging unlocks once the host approves your request.'
                : viewerStatus === 'waitlisted'
                    ? 'Messaging unlocks once you are moved from the waitlist to confirmed.'
                    : 'Group messaging is currently unavailable.'
    const showChatLockOverlay = messageAccessDenied
    const showFeedbackLockOverlay = Boolean(feedbackForm && !feedbackForm.activityEnded)
    const composerDisabled = !canUseGroupChat || messageAccessDenied

    useEffect(() => {
        if (!feedbackForm) return
        if (feedbackForm.feedback) {
            setActivityRating(feedbackForm.feedback.rating)
            setActivityComment(feedbackForm.feedback.comment ?? '')
            setConsentToAnalysis(feedbackForm.feedback.consentToAnalysis)
            const existingRatings = feedbackForm.feedback.participantRatings.reduce(
                (acc, rating) => {
                    acc[rating.profileId] = {
                        rating: rating.rating,
                        comment: rating.comment ?? '',
                    }
                    return acc
                },
                {} as Record<string, { rating: number | null; comment: string }>,
            )
            setParticipantRatings(existingRatings)
        } else {
            setActivityRating(null)
            setActivityComment('')
            setConsentToAnalysis(false)
            setParticipantRatings({})
        }
        setFeedbackSubmitError(null)
    }, [feedbackForm])

    useEffect(() => {
        if (!activityId) return
        if (isHost || viewerStatus === 'confirmed') {
            void refetchMessages()
        }
    }, [activityId, isHost, refetchMessages, viewerStatus])

    const handleJoin = async () => {
        try {
            setIsSubmitting(true)
            setActionError(null)
            await join(activity?.isPublic ? {} : { message: joinMessage || undefined })
            await refetchMessages()
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

    const handleSendMessage = async () => {
        if (!messageText.trim()) return
        try {
            setIsSendingMessage(true)
            setMessageError(null)
            await postMessage({
                content: messageText.trim(),
                messageType: sendAnnouncement ? 'announcement' : 'user',
                isPinned: sendPinned,
            })
            setMessageText('')
            setSendPinned(false)
            setSendAnnouncement(false)
        } catch (err) {
            setMessageError(err instanceof Error ? err.message : 'Failed to send message')
        } finally {
            setIsSendingMessage(false)
        }
    }

    const handleReport = async (messageId: string) => {
        const reason = window.prompt('Why are you reporting this message?')
        if (!reason) return
        try {
            await reportMessage(messageId, reason)
        } catch (err) {
            setMessageError(err instanceof Error ? err.message : 'Failed to report message')
        }
    }

    const handleSubmitFeedback = async () => {
        if (!activityRating) {
            setFeedbackSubmitError('Please select an activity rating.')
            return
        }
        if (!consentToAnalysis) {
            setFeedbackSubmitError('Consent is required to submit feedback.')
            return
        }

        const participantRatingsPayload = (feedbackForm?.participants ?? [])
            .map((participant) => {
                const rating = participantRatings[participant.profileId]?.rating ?? null
                const comment = participantRatings[participant.profileId]?.comment ?? ''
                return rating
                    ? {
                        profileId: participant.profileId,
                        rating,
                        comment: comment.trim() ? comment.trim() : undefined,
                    }
                    : null
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)

        try {
            setIsSubmittingFeedback(true)
            setFeedbackSubmitError(null)
            await submitFeedback({
                rating: activityRating,
                comment: activityComment.trim() ? activityComment.trim() : undefined,
                consentToAnalysis,
                participantRatings: participantRatingsPayload,
            })
        } catch (err) {
            setFeedbackSubmitError(err instanceof Error ? err.message : 'Failed to submit feedback')
        } finally {
            setIsSubmittingFeedback(false)
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
            <ProtectedHeader />

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
                {showAds ? <AdSlot /> : null}
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
                    <ErrorBlock title="Unable to load activity" message={error} />
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
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <Badge variant="outline" className="w-fit capitalize">
                                                {activity.status}
                                            </Badge>
                                            <CardTitle className="text-3xl">{activity.title}</CardTitle>
                                            <p className="text-muted-foreground">{activity.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Hosted by {activity.hostUsername || activity.hostName || activity.hostId.slice(0, 8)}
                                            </p>
                                        </div>
                                        {!isHost ? (
                                            <Button
                                                size="lg"
                                                onClick={handleJoin}
                                                disabled={!canJoin || isSubmitting}
                                                className="min-w-[180px]"
                                            >
                                                {viewerStatus === 'not_joined'
                                                    ? activity.isPublic
                                                        ? 'Join Activity'
                                                        : 'Request to Join'
                                                    : viewerStatus === 'pending'
                                                        ? 'Request Pending'
                                                        : viewerStatus === 'waitlisted'
                                                            ? 'On Waitlist'
                                                            : 'Joined'}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="overflow-hidden rounded-xl border bg-muted/40">
                                    <img
                                        src={activityImageUrl}
                                        alt={`${activity.title} hero image`}
                                        className="h-64 w-full object-cover md:h-80 lg:h-96"
                                    />
                                </div>
                                <div className="grid items-stretch gap-6 lg:grid-cols-[1.4fr_1fr]">
                                    <div className="space-y-6">
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg">Location</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <ActivityLocationMap
                                                    latitude={activity.location?.latitude}
                                                    longitude={activity.location?.longitude}
                                                    isApproximate={Boolean(activity.meetingPointHidden)}
                                                />
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="h-4 w-4" />
                                                    <span className="text-foreground">{locationLabel}</span>
                                                </div>
                                            </CardContent>
                                        </Card>

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
                                            <div className="flex items-center gap-2 sm:col-span-2">
                                                <Users className="h-4 w-4" />
                                                <span className="text-foreground">
                                                    {goingCount} / {activity.maxParticipants} going (waitlist {activity.waitlistCount})
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
                                                    <ErrorBlock title="Action failed" message={actionError} />
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
                                                    {activityStarted && viewerStatus === 'not_joined' ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            This activity has already started and can no longer be joined.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground space-y-2">
                                                    <p>
                                                        You are the host. Manage participants on the{' '}
                                                        <Link href={`/host/activities/${activity.id}/participants`} className="text-primary underline">
                                                            roster page
                                                        </Link>
                                                        .
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {activityStarted ? (
                                                            <Button size="sm" variant="outline" disabled>
                                                                Edit unavailable after start
                                                            </Button>
                                                        ) : (
                                                            <Button asChild size="sm" variant="outline">
                                                                <Link href={`/activities/${activity.id}/edit`}>Edit activity</Link>
                                                            </Button>
                                                        )}
                                                        <Button asChild size="sm" variant="outline">
                                                            <Link href="/activities/groups">Manage groups</Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-full">
                                <Card className="relative flex h-full flex-col overflow-hidden border-dashed">
                                    <CardHeader>
                                        <CardTitle>Group messages</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col space-y-4">
                                        {messagesError ? (
                                            !messageAccessDenied ? (
                                                <ErrorBlock title="Couldn't load messages" message={messagesError} />
                                            ) : null
                                        ) : null}
                                        <div
                                            className={`flex min-h-0 flex-1 flex-col ${
                                                showChatLockOverlay ? 'pointer-events-none select-none blur-[2px]' : ''
                                            }`}
                                        >
                                            {pinned ? (
                                            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Pin className="h-4 w-4" />
                                                    <span className="text-xs uppercase tracking-wide">Pinned announcement</span>
                                                </div>
                                                <p className="mt-2 text-sm text-foreground">{pinned.content}</p>
                                            </div>
                                        ) : null}
                                        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                            {messagesLoading ? (
                                                <Skeleton className="h-16 w-full" />
                                            ) : messageAccessDenied ? null : messages.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No messages yet.</p>
                                            ) : (
                                                messages.map((message) => (
                                                    <div
                                                        key={message.id}
                                                        className="rounded-md border bg-background p-3 text-sm space-y-2"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {message.authorName || (message.messageType === 'system' ? 'System' : 'Participant')}
                                                            </span>
                                                            <span className="flex items-center gap-2">
                                                                {message.messageType !== 'user' ? (
                                                                    <Badge variant="outline" className="capitalize">
                                                                        {message.messageType}
                                                                    </Badge>
                                                                ) : null}
                                                                {message.isPinned ? (
                                                                    <Badge variant="outline">Pinned</Badge>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-foreground">{message.content}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {isHost ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => pinMessage(message.id, !message.isPinned)}
                                                                    disabled={!canUseAutomation}
                                                                >
                                                                    {message.isPinned ? 'Unpin' : 'Pin'}
                                                                </Button>
                                                            ) : null}
                                                            {message.messageType !== 'system' ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleReport(message.id)}
                                                                >
                                                                    Report
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="space-y-2 border-t bg-background/90 pt-3 backdrop-blur-sm">
                                            {messageError ? <ErrorBlock title="Couldn't send message" message={messageError} /> : null}
                                            <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Send a message to the group"
                                                value={messageText}
                                                onChange={(event) => setMessageText(event.target.value)}
                                                disabled={composerDisabled}
                                                className={composerDisabled ? 'opacity-60' : undefined}
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={composerDisabled || !messageText.trim() || isSendingMessage}
                                                className={composerDisabled ? 'opacity-60' : undefined}
                                            >
                                                {isSendingMessage ? 'Sending...' : 'Send'}
                                            </Button>
                                            </div>
                                            {!canUseGroupChat ? (
                                                <UpgradeHint message="Messaging is limited on your current plan." className="text-xs" />
                                            ) : messageAccessDenied ? (
                                                <p className="text-xs text-muted-foreground">{messageAccessHint}</p>
                                            ) : null}
                                            {isHost ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={sendAnnouncement ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setSendAnnouncement((prev) => !prev)}
                                                        disabled={!canUseAutomation}
                                                        className={!canUseAutomation ? 'opacity-60' : undefined}
                                                    >
                                                        Announcement
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={sendPinned ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setSendPinned((prev) => !prev)}
                                                        disabled={!canUseAutomation}
                                                        className={!canUseAutomation ? 'opacity-60' : undefined}
                                                    >
                                                        Pin message
                                                    </Button>
                                                </div>
                                            ) : null}
                                            {!canUseAutomation && isHost ? (
                                                <UpgradeHint message="Announcements require automation access." className="text-xs" />
                                            ) : null}
                                        </div>
                                        </div>
                                        {showChatLockOverlay ? (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                                                <div className="max-w-sm rounded-xl border bg-background/90 p-5 text-center shadow-lg">
                                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <Lock className="h-5 w-5 text-foreground" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground">Group chat unlocks after you join</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Join this activity to view and send group messages.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                                    </div>
                                </div>
                                <Card className="relative overflow-hidden border-dashed">
                                    <CardHeader>
                                        <CardTitle>Post-activity feedback</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className={showFeedbackLockOverlay ? 'pointer-events-none select-none blur-[2px]' : ''}>
                                        {feedbackLoading ? (
                                            <Skeleton className="h-24 w-full" />
                                        ) : feedbackError ? (
                                            <ErrorBlock title="Couldn't load feedback" message={feedbackError} />
                                        ) : feedbackForm ? (
                                            <>
                                                {!feedbackForm.activityEnded ? (
                                                    <div className="space-y-3">
                                                        <p className="text-sm text-muted-foreground">
                                                            Feedback opens after the activity ends.
                                                        </p>
                                                        <fieldset disabled className="space-y-2 opacity-60">
                                                            <p className="text-sm font-medium text-foreground">Rate this activity</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {[1, 2, 3, 4, 5].map((rating) => (
                                                                    <Button key={rating} type="button" size="sm" variant="outline">
                                                                        {rating}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                            <Textarea placeholder="Survey will be enabled after the activity ends." />
                                                        </fieldset>
                                                    </div>
                                                ) : feedbackForm.submitted ? (
                                                    <div className="space-y-2 text-sm text-muted-foreground">
                                                        <p>Thanks for sharing your feedback.</p>
                                                        <p>
                                                            Activity rating:{' '}
                                                            <span className="font-medium text-foreground">
                                                                {feedbackForm.feedback?.rating ?? '-'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                ) : feedbackForm.eligible ? (
                                                    <div className="space-y-5">
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-medium text-foreground">
                                                                Rate this activity
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {[1, 2, 3, 4, 5].map((rating) => (
                                                                    <Button
                                                                        key={rating}
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={activityRating === rating ? 'default' : 'outline'}
                                                                        onClick={() => setActivityRating(rating)}
                                                                    >
                                                                        {rating}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="activity-feedback-comment">
                                                                Optional comment
                                                            </Label>
                                                            <Textarea
                                                                id="activity-feedback-comment"
                                                                value={activityComment}
                                                                onChange={(event) => setActivityComment(event.target.value)}
                                                                placeholder="Share anything that stood out."
                                                            />
                                                        </div>

                                                        {feedbackForm.participants.length > 0 ? (
                                                            <div className="space-y-3">
                                                                <p className="text-sm font-medium text-foreground">
                                                                    Rate other participants
                                                                </p>
                                                                <div className="space-y-4">
                                                                    {feedbackForm.participants.map((participant) => {
                                                                        const current = participantRatings[participant.profileId]
                                                                        return (
                                                                            <div
                                                                                key={participant.profileId}
                                                                                className="rounded-md border bg-background p-3 space-y-3"
                                                                            >
                                                                                <div className="flex items-center justify-between gap-3">
                                                                                    <div>
                                                                                        <p className="text-sm font-medium text-foreground">
                                                                                            {participant.fullName ?? 'Participant'}
                                                                                            {participant.isHost ? ' (Host)' : ''}
                                                                                        </p>
                                                                                        {participant.ratingSummary ? (
                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                Avg rating:{' '}
                                                                                                {participant.ratingSummary.averageRating ?? 'N/A'} (
                                                                                                {participant.ratingSummary.ratingsCount} ratings)
                                                                                            </p>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {[1, 2, 3, 4, 5].map((rating) => (
                                                                                            <Button
                                                                                                key={rating}
                                                                                                type="button"
                                                                                                size="sm"
                                                                                                variant={
                                                                                                    current?.rating === rating
                                                                                                        ? 'default'
                                                                                                        : 'outline'
                                                                                                }
                                                                                                onClick={() =>
                                                                                                    setParticipantRatings((prev) => ({
                                                                                                        ...prev,
                                                                                                        [participant.profileId]: {
                                                                                                            rating,
                                                                                                            comment: current?.comment ?? '',
                                                                                                        },
                                                                                                    }))
                                                                                                }
                                                                                            >
                                                                                                {rating}
                                                                                            </Button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <Textarea
                                                                                    value={current?.comment ?? ''}
                                                                                    onChange={(event) =>
                                                                                        setParticipantRatings((prev) => ({
                                                                                            ...prev,
                                                                                            [participant.profileId]: {
                                                                                                rating: current?.rating ?? null,
                                                                                                comment: event.target.value,
                                                                                            },
                                                                                        }))
                                                                                    }
                                                                                    placeholder="Optional comment about this participant"
                                                                                />
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        <div className="flex items-start gap-3">
                                                            <Checkbox
                                                                id="feedback-consent"
                                                                checked={consentToAnalysis}
                                                                onCheckedChange={(checked) => setConsentToAnalysis(Boolean(checked))}
                                                            />
                                                            <Label htmlFor="feedback-consent" className="text-sm text-muted-foreground">
                                                                I consent to OuterCircl using this feedback for analysis and safety insights.
                                                            </Label>
                                                        </div>

                                                        {feedbackSubmitError ? (
                                                            <ErrorBlock title="Couldn't submit feedback" message={feedbackSubmitError} />
                                                        ) : null}

                                                        <Button
                                                            onClick={handleSubmitFeedback}
                                                            disabled={isSubmittingFeedback || !consentToAnalysis}
                                                        >
                                                            {isSubmittingFeedback ? 'Submitting...' : 'Submit feedback'}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        {feedbackForm.reason ?? 'Feedback is not available yet.'}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Feedback not available.</p>
                                        )}
                                        </div>
                                        {showFeedbackLockOverlay ? (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                                                <div className="max-w-sm rounded-xl border bg-background/90 p-5 text-center shadow-lg">
                                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <Lock className="h-5 w-5 text-foreground" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground">Post-activity survey is locked</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Survey responses unlock after completion criteria is met.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </main>
        </div>
    )
}

