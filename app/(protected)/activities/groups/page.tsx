'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuthState } from '@/hooks/useAuthState'

type Group = {
  id: string
  name: string
  description?: string | null
  is_public: boolean
  max_members: number
}

export default function GroupsPage() {
  const { user } = useAuthState()
  const isPremium = user?.type === 'PREMIUM'

  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState('15')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/rpc/v1/activities/groups')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setGroups(Array.isArray(data) ? data : [])
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch('/rpc/v1/activities/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          maxMembers: Number(maxMembers),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to create group')
      }
      const group = (await res.json()) as Group
      setGroups((prev) => [group, ...prev])
      setName('')
      setDescription('')
      setMaxMembers('15')
      setIsPublic(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-0">
      <Button asChild variant="ghost" className="gap-2">
        <Link href="/activities">
          <ArrowLeft className="h-4 w-4" />
          Back to activities
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Activity groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPremium ? (
            <p className="text-sm text-muted-foreground">Upgrade to premium to create and manage groups.</p>
          ) : (
            <>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  placeholder="Max members (15)"
                />
                <Button variant={isPublic ? 'default' : 'outline'} onClick={() => setIsPublic((prev) => !prev)}>
                  {isPublic ? 'Public group' : 'Private group'}
                </Button>
              </div>
              <Button onClick={handleCreate} disabled={!name || isSubmitting}>
                Create group
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your groups</h2>
          <span className="text-sm text-muted-foreground">{groups.length} total</span>
        </div>
        {groups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Users className="h-5 w-5" />
              No groups yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.is_public ? 'Public' : 'Private'} · {group.max_members} max
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {group.description || 'No description provided.'}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

