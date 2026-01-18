'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuthState } from '@/hooks/useAuthState'

type Group = {
  id: string
  name: string
  is_public: boolean
}

export default function CreateActivityPage() {
  const { user } = useAuthState()
  const isPremium = user?.type === 'PREMIUM'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [interests, setInterests] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(isPremium ? '6' : '4')
  const [isPublic, setIsPublic] = useState(true)
  const [groupId, setGroupId] = useState<string | undefined>(undefined)

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [interval, setInterval] = useState('1')
  const [endsOn, setEndsOn] = useState('')
  const [occurrences, setOccurrences] = useState('')

  const [groups, setGroups] = useState<Group[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMaxParticipants(isPremium ? '6' : '4')
  }, [isPremium])

  useEffect(() => {
    if (!isPremium) return
    let cancelled = false
    async function loadGroups() {
      try {
        const res = await fetch('/rpc/v1/activities/groups')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setGroups(data ?? [])
      } catch {
        // ignore
      }
    }
    loadGroups()
    return () => {
      cancelled = true
    }
  }, [isPremium])

  const parsedInterests = useMemo(
    () =>
      interests
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) =>
          value
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, ''),
        ),
    [interests],
  )

  const hasRequiredLocation = Boolean(address.trim() && latitude.trim() && longitude.trim())
  const hasRequiredTags = parsedInterests.length > 0
  const canSubmit = Boolean(
    title.trim() &&
      category.trim() &&
      hasRequiredTags &&
      hasRequiredLocation &&
      activityDate &&
      startTime &&
      endTime &&
      maxParticipants,
  )

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      const payload = {
        title,
        description,
        category,
        interests: parsedInterests,
        location: {
          address,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        },
        activityDate,
        startTime,
        endTime,
        maxParticipants: isPremium ? Number(maxParticipants) : 4,
        isPublic,
        groupId: isPremium ? groupId : undefined,
        recurrence: recurrenceEnabled
          ? {
              frequency,
              interval: Number(interval || 1),
              endsOn: endsOn || undefined,
              occurrences: occurrences ? Number(occurrences) : undefined,
            }
          : undefined,
      }

      const res = await fetch('/rpc/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to create activity')
      }

      const activity = await res.json()
      window.location.href = `/activities/${activity.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-0">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2">
          <Link href="/activities">
            <ArrowLeft className="h-4 w-4" />
            Back to activities
          </Link>
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="gap-2">
          <Save className="h-4 w-4" />
          Create activity
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Category <span className="text-red-500">*</span>
            </Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" required />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Interests <span className="text-red-500">*</span>
            </Label>
            <Input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Interests (comma separated, e.g. sports, football)"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Interests are stored as slugs (lowercase with underscores). We convert your input automatically.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Latitude <span className="text-red-500">*</span>
              </Label>
              <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude" required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Longitude <span className="text-red-500">*</span>
              </Label>
              <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude" required />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Start time <span className="text-red-500">*</span>
              </Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                End time <span className="text-red-500">*</span>
              </Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              placeholder={isPremium ? 'Max participants' : 'Fixed at 4 for free tier'}
              disabled={!isPremium}
            />
            <Select value={isPublic ? 'public' : 'private'} onValueChange={(v) => setIsPublic(v === 'public')}>
              <SelectTrigger>
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPremium ? (
            <Select value={groupId ?? 'none'} onValueChange={(v) => setGroupId(v === 'none' ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select group (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} {group.is_public ? '(Public)' : '(Private)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">Upgrade to premium to host activities in groups.</p>
          )}

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                Recurrence
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecurrenceEnabled((prev) => !prev)}
              >
                {recurrenceEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
            {recurrenceEnabled ? (
              <div className="grid gap-3 md:grid-cols-4">
                <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly' | 'monthly')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={interval} onChange={(e) => setInterval(e.target.value)} placeholder="Interval" />
                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                <Input
                  value={occurrences}
                  onChange={(e) => setOccurrences(e.target.value)}
                  placeholder="Occurrences"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enable recurring schedule to repeat this activity automatically.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

