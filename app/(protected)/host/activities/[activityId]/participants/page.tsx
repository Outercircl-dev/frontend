'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock } from '@/components/ui/error-block'
import { Skeleton } from '@/components/ui/skeleton'
import { ProtectedHeader } from '@/components/layout/ProtectedHeader'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'

interface ParticipantSummary {
  id: string
  profileId: string
  supabaseUserId: string
  fullName: string | null
  avatarUrl: string | null
  status: 'confirmed' | 'pending' | 'waitlisted' | 'cancelled'
  waitlistPosition: number | null
  approvalMessage?: string | null
}

export default function HostParticipantsPage({ params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = use(params)
  const [participants, setParticipants] = useState<ParticipantSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const fetchRoster = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchJson<{ participants: ParticipantSummary[] }>(
        `/rpc/v1/activities/${activityId}/participants`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        'Failed to load participants',
      )
      setParticipants(data.participants ?? [])
    } catch (err) {
      setError(getErrorMessage(err, 'Unknown error loading participants'))
      setParticipants([])
    } finally {
      setIsLoading(false)
    }
  }, [activityId])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  const moderate = async (participantId: string, action: 'approve' | 'reject') => {
    try {
      setPendingId(participantId)
      setActionError(null)
      await fetchJson(
        `/rpc/v1/activities/${activityId}/participants/${participantId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
        `Failed to ${action} participant`,
      )
      await fetchRoster()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update participant'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <ProtectedHeader />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Participant roster</h1>
            <p className="text-sm text-muted-foreground">Manage requests and waitlist.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/activities/${activityId}`}>Back to activity</Link>
          </Button>
        </div>

        {error ? <ErrorBlock title="Unable to load roster" message={error} onRetry={fetchRoster} /> : null}

        {!error ? (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="space-y-3">
              <CardTitle>Participants</CardTitle>
              {actionError ? <ErrorBlock title="Couldn't update participant" message={actionError} /> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : participants.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <Users className="h-5 w-5" />
                    No participants yet. Share your activity and review requests here when they arrive.
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Waitlist</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/60">
                      {participants.map((participant) => (
                        <tr key={participant.id} className="align-middle">
                          <td className="py-3">
                            <div className="font-medium text-foreground">{participant.fullName ?? 'Unnamed participant'}</div>
                            {participant.approvalMessage ? (
                              <p className="text-xs text-muted-foreground">{participant.approvalMessage}</p>
                            ) : null}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                participant.status === 'confirmed'
                                  ? 'default'
                                  : participant.status === 'pending'
                                    ? 'secondary'
                                    : participant.status === 'waitlisted'
                                      ? 'outline'
                                      : 'destructive'
                              }
                            >
                              {participant.status}
                            </Badge>
                          </td>
                          <td className="py-3">{participant.waitlistPosition ? `#${participant.waitlistPosition}` : '—'}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {participant.status === 'pending' || participant.status === 'waitlisted' ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => moderate(participant.id, 'approve')}
                                    disabled={pendingId === participant.id}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => moderate(participant.id, 'reject')}
                                    disabled={pendingId === participant.id}
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No action</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  )
}

