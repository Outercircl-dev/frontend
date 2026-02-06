'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, Save } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeHint } from '@/components/membership/UpgradeHint'
import { getInterestsAction } from '@/actions/profile'
import { useAuthState } from '@/hooks/useAuthState'
import { cn } from '@/lib/utils'
import type { InterestCategory } from '@/lib/types/profile'

type Group = {
  id: string
  name: string
  is_public: boolean
}

export default function CreateActivityPage() {
  const { user } = useAuthState()
  const tierRules = user?.tierRules
  const hostingRules = tierRules?.hosting
  const groupsRules = tierRules?.groups
  const verificationRules = tierRules?.verification
  const maxParticipantsLimit = hostingRules?.maxParticipantsPerActivity
  const enforceExactMaxParticipants = hostingRules?.enforceExactMaxParticipants
  const groupsEnabled = groupsRules?.enabled ?? false
  const requiresVerifiedHost = Boolean(verificationRules?.requiresVerifiedHostForHosting)
  const isVerifiedHost = user?.role === 'authenticated'
  const canHost = !requiresVerifiedHost || isVerifiedHost
  const maxParticipantsDisabled =
    Boolean(enforceExactMaxParticipants) && maxParticipantsLimit !== null && maxParticipantsLimit !== undefined

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [groupId, setGroupId] = useState<string | undefined>(undefined)

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [interval, setInterval] = useState('1')
  const [endsOn, setEndsOn] = useState('')
  const [occurrences, setOccurrences] = useState('')

  const [groups, setGroups] = useState<Group[]>([])
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([])
  const [interestsLoading, setInterestsLoading] = useState(true)
  const [interestsError, setInterestsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (maxParticipantsLimit === null || maxParticipantsLimit === undefined) {
      return
    }
    if (maxParticipantsDisabled || !maxParticipants) {
      setMaxParticipants(String(maxParticipantsLimit))
    }
  }, [maxParticipantsDisabled, maxParticipantsLimit, maxParticipants])

  useEffect(() => {
    if (!groupsEnabled) return
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
  }, [groupsEnabled])

  useEffect(() => {
    let cancelled = false
    async function loadInterests() {
      const result = await getInterestsAction()
      if (cancelled) return
      if (result.categories?.length) {
        setInterestCategories(result.categories)
      }
      setInterestsError(result.error)
      setInterestsLoading(false)
    }
    loadInterests()
    return () => {
      cancelled = true
    }
  }, [])

  const hasRequiredLocation = Boolean(address.trim() && latitude.trim() && longitude.trim())
  const hasRequiredTags = selectedInterests.length > 0
  const canSubmit = Boolean(
    title.trim() &&
      category.trim() &&
      hasRequiredTags &&
      hasRequiredLocation &&
      activityDate &&
      startTime &&
      endTime &&
      maxParticipants,
  ) && canHost

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      const numericMaxParticipants = Number(maxParticipants)
      const resolvedMaxParticipants =
        maxParticipantsLimit !== null &&
        maxParticipantsLimit !== undefined &&
        (maxParticipantsDisabled || numericMaxParticipants > maxParticipantsLimit)
          ? maxParticipantsLimit
          : numericMaxParticipants

      const payload = {
        title,
        description,
        category,
        interests: selectedInterests,
        location: {
          address,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
        },
        activityDate,
        startTime,
        endTime,
        maxParticipants: resolvedMaxParticipants,
        isPublic,
        groupId: groupsEnabled ? groupId : undefined,
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
        <div className="flex flex-col items-end gap-2">
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            Create activity
          </Button>
          {!canHost ? (
            <UpgradeHint message="Hosting requires a verified plan." className="text-xs" />
          ) : null}
        </div>
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
          <div className="space-y-3">
            <Label className="flex items-center gap-1">
              Interests <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Badge variant={selectedInterests.length > 0 ? 'default' : 'secondary'}>
                {selectedInterests.length} selected
              </Badge>
              <span className="text-xs text-muted-foreground">Choose at least 1 (up to 10).</span>
            </div>
            {interestsError ? <p className="text-xs text-destructive">{interestsError}</p> : null}
            {interestsLoading ? (
              <p className="text-sm text-muted-foreground">Loading interests...</p>
            ) : (
              <div className="max-h-[320px] space-y-4 overflow-y-auto pr-2">
                {interestCategories.map((interestCategory) => (
                  <div key={interestCategory.name} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {interestCategory.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {interestCategory.interests.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.slug)
                        const isDisabled = !isSelected && selectedInterests.length >= 10
                        return (
                          <button
                            key={interest.slug}
                            type="button"
                            onClick={() => {
                              setSelectedInterests((prev) =>
                                prev.includes(interest.slug)
                                  ? prev.filter((slug) => slug !== interest.slug)
                                  : prev.length < 10
                                    ? [...prev, interest.slug]
                                    : prev,
                              )
                            }}
                            disabled={isDisabled}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5',
                              isDisabled && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <span>{interest.icon}</span>
                            <span>{interest.name}</span>
                            {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            <div className="space-y-2">
              <Input
                type="number"
                min={1}
                max={maxParticipantsLimit ?? undefined}
                value={maxParticipants}
                onChange={(e) => {
                  const next = e.target.value
                  if (!next) {
                    setMaxParticipants('')
                    return
                  }
                  const numeric = Number(next)
                  if (Number.isNaN(numeric)) return
                  if (maxParticipantsLimit !== null && maxParticipantsLimit !== undefined && numeric > maxParticipantsLimit) {
                    setMaxParticipants(String(maxParticipantsLimit))
                    return
                  }
                  setMaxParticipants(next)
                }}
                placeholder={maxParticipantsDisabled ? `Fixed at ${maxParticipantsLimit}` : 'Max participants'}
                disabled={maxParticipantsDisabled}
                className={cn(maxParticipantsDisabled && 'opacity-60')}
              />
              {maxParticipantsDisabled ? (
                <UpgradeHint message="Adjusting participant limits is a premium feature." className="text-xs" />
              ) : null}
            </div>
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

          <div className="space-y-2">
            <Select
              value={groupId ?? 'none'}
              onValueChange={(v) => setGroupId(v === 'none' ? undefined : v)}
              disabled={!groupsEnabled}
            >
              <SelectTrigger className={cn(!groupsEnabled && 'opacity-60')}>
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
            {!groupsEnabled ? (
              <UpgradeHint message="Groups are available on higher tiers." className="text-xs" />
            ) : null}
          </div>

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

