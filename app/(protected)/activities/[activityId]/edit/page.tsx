'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeHint } from '@/components/membership/UpgradeHint'
import { PlaceAutocompleteInput, type SelectedPlace } from '@/components/activities/place-autocomplete-input'
import { useAuthState } from '@/hooks/useAuthState'
import type { Activity } from '@/lib/types/activity'
import { hasActivityStarted } from '@/src/utils/activityDateTime'
import {
  getCurrentDateInTimezone,
  resolveClientTimezone,
  validateActivityCreationInput,
} from '@/src/utils/activityCreationValidation'
import { uploadActivityImage, validateActivityImage } from '@/lib/api/activity-image-upload'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'
import { ErrorBlock } from '@/components/ui/error-block'

type Group = {
  id: string
  name: string
  is_public: boolean
}

export default function EditActivityPage({ params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = use(params)
  const { user } = useAuthState()
  const router = useRouter()
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

  const [activity, setActivity] = useState<Activity | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [interests, setInterests] = useState('')
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null)
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
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const timezone = resolveClientTimezone()
  const minActivityDate = getCurrentDateInTimezone(timezone)

  useEffect(() => {
    if (maxParticipantsLimit === null || maxParticipantsLimit === undefined) {
      return
    }
    if (maxParticipantsDisabled || !maxParticipants) {
      setMaxParticipants(String(maxParticipantsLimit))
    }
  }, [maxParticipantsDisabled, maxParticipantsLimit, maxParticipants])

  useEffect(() => {
    let cancelled = false
    async function loadActivity() {
      try {
        if (!user?.supabaseUserId) return
        const data = await fetchJson<Activity>(
          `/rpc/v1/activities/${activityId}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } },
          'Failed to load activity',
        )
        if (cancelled) return
        if (user.supabaseUserId !== data.hostId) {
          setError('You are not authorized to edit this activity')
          router.replace(`/activities/${data.id}`)
          return
        }
        if (hasActivityStarted(data.activityDate, data.startTime)) {
          setError('Activity has already started and can no longer be edited')
          router.replace(`/activities/${data.id}`)
          return
        }
        setActivity(data)
        setTitle(data.title)
        setDescription(data.description ?? '')
        setCategory(data.category ?? '')
        setInterests((data.interests ?? []).join(', '))
        const latitude = data.location?.latitude
        const longitude = data.location?.longitude
        const placeId = data.location?.placeId
        const address = data.location?.address ?? ''
        setSelectedPlace(
          typeof latitude === 'number' && typeof longitude === 'number' && placeId && address
            ? { address, latitude, longitude, placeId }
            : null,
        )
        setActivityDate(data.activityDate)
        setStartTime(data.startTime)
        setEndTime(data.endTime ?? '')
        setMaxParticipants(String(data.maxParticipants))
        setIsPublic(Boolean(data.isPublic))
        setGroupId(data.group?.id ?? undefined)
        setCurrentImageUrl(data.imageUrl ?? null)
        setRemoveImage(false)
        setImageFile(null)
        if (data.recurrence) {
          setRecurrenceEnabled(true)
          setFrequency(data.recurrence.frequency)
          setInterval(String(data.recurrence.interval))
          setEndsOn(data.recurrence.endsOn ?? '')
          setOccurrences(data.recurrence.occurrences ? String(data.recurrence.occurrences) : '')
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Failed to load activity'))
      }
    }
    loadActivity()
    return () => {
      cancelled = true
    }
  }, [activityId, router, user?.supabaseUserId])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

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

  const hasRequiredLocation = Boolean(
    selectedPlace?.address &&
      Number.isFinite(selectedPlace.latitude) &&
      Number.isFinite(selectedPlace.longitude) &&
      selectedPlace.placeId,
  )
  const hasRequiredTags = parsedInterests.length > 0
  const semanticValidationError =
    activityDate && startTime && endTime
      ? validateActivityCreationInput({
          address: selectedPlace?.address ?? '',
          placeId: selectedPlace?.placeId ?? '',
          activityDate,
          startTime,
          endTime,
          timezone,
        })
      : null
  const scheduleValidationError =
    semanticValidationError &&
    (semanticValidationError.toLowerCase().includes('time') ||
      semanticValidationError.toLowerCase().includes('date'))
      ? semanticValidationError
      : null
  const canSubmit = Boolean(
    title.trim() &&
      category.trim() &&
      hasRequiredTags &&
      hasRequiredLocation &&
      activityDate &&
      startTime &&
      endTime &&
      maxParticipants,
  ) && canHost && !semanticValidationError

  const handleSubmit = async () => {
    try {
      if (semanticValidationError) {
        return
      }
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
        interests: parsedInterests,
        location: {
          address: selectedPlace?.address ?? '',
          latitude: selectedPlace?.latitude ?? null,
          longitude: selectedPlace?.longitude ?? null,
          placeId: selectedPlace?.placeId ?? undefined,
        },
        activityDate,
        startTime,
        endTime,
        timezone,
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
        imageUrl: imageFile
          ? await uploadActivityImage(imageFile)
          : removeImage
            ? null
            : currentImageUrl,
      }

      const updated = await fetchJson<Activity>(
        `/rpc/v1/activities/${activityId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'Failed to update activity',
      )
      router.push(`/activities/${updated.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update activity'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-0">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="gap-2">
          <Link href={activity ? `/activities/${activity.id}` : '/activities'}>
            <ArrowLeft className="h-4 w-4" />
            Back to activity
          </Link>
        </Button>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={handleSubmit} disabled={!activity || !canSubmit || isSubmitting} className="gap-2">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
          {!canHost ? (
            <UpgradeHint message="Hosting requires a verified plan." className="text-xs" />
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <ErrorBlock title="Couldn't update activity" message={error} /> : null}

          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <div className="space-y-2">
            <Label>Activity image</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                if (!selected) {
                  setImageFile(null)
                  return
                }
                const validationError = validateActivityImage(selected)
                if (validationError) {
                  setError(validationError)
                  event.target.value = ''
                  return
                }
                setError(null)
                setRemoveImage(false)
                setImageFile(selected)
              }}
            />
            <p className="text-xs text-muted-foreground">Optional. JPG, PNG, WEBP up to 5MB.</p>
            {imagePreviewUrl || (currentImageUrl && !removeImage) ? (
              <div className="space-y-2">
                <img
                  src={imagePreviewUrl || currentImageUrl || '/default-activity.svg'}
                  alt="Activity image preview"
                  className="h-44 w-full rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageFile(null)
                    setRemoveImage(true)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                >
                  Remove image
                </Button>
              </div>
            ) : null}
          </div>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" required />
          <Input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Interests (comma separated, e.g. sports, football)"
            required
          />
          <p className="text-xs text-muted-foreground">
            Interests are stored as slugs (lowercase with underscores). We convert your input automatically.
          </p>

          <div className="space-y-3">
            <PlaceAutocompleteInput
              required
              initialAddress={selectedPlace?.address ?? ''}
              onPlaceSelected={setSelectedPlace}
              onPlaceCleared={() => setSelectedPlace(null)}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={selectedPlace?.latitude ?? ''} readOnly placeholder="Latitude" />
              <Input value={selectedPlace?.longitude ?? ''} readOnly placeholder="Longitude" />
              <Input value={selectedPlace?.placeId ?? ''} readOnly placeholder="Place ID" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              type="date"
              min={minActivityDate}
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              required
            />
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
          {scheduleValidationError ? <p className="text-sm text-red-600">{scheduleValidationError}</p> : null}

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
                className={maxParticipantsDisabled ? 'opacity-60' : undefined}
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
              <SelectTrigger className={!groupsEnabled ? 'opacity-60' : undefined}>
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
                <Input type="number" value={interval} onChange={(e) => setInterval(e.target.value)} placeholder="Interval" />
                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                <Input
                  type="number"
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

