'use client'

import Image from 'next/image'
import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { Loader2, LogOut } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      const res = await fetch(`/rpc/v1/activities/${activityId}/participants`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to load participants (${res.status})`)
      }
      const data = await res.json()
      setParticipants(data.participants ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading participants')
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
      const res = await fetch(`/rpc/v1/activities/${activityId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Failed to ${action} participant (${res.status})`)
      }
      await fetchRoster()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update participant')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/feed" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OuterCircl" width={140} height={40} className="h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/activities">Activities</Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href={`/activities/${activityId}`}>Activity details</Link>
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

        {error ? (
        <Card className="border-red-200 bg-red-50 animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="text-red-700">Unable to load roster</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700/90">{error}</CardContent>
        </Card>
      ) : (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roster…
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants yet.</p>
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
                          <div className="font-medium text-foreground">
                            {participant.fullName ?? 'Unnamed participant'}
                          </div>
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
                        <td className="py-3">
                          {participant.waitlistPosition ? `#${participant.waitlistPosition}` : '—'}
                        </td>
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
      )}
      </main>
    </div>
  )
}

