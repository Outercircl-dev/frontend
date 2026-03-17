'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, Save } from 'lucide-react'

import { getInterestsAction } from '@/actions/profile'
import { PlaceAutocompleteInput, type SelectedPlace } from '@/components/activities/place-autocomplete-input'
import { UpgradeHint } from '@/components/membership/UpgradeHint'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock } from '@/components/ui/error-block'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuthState } from '@/hooks/useAuthState'
import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'
import { uploadActivityImage, validateActivityImage } from '@/lib/api/activity-image-upload'
import type { Activity } from '@/lib/types/activity'
import type { InterestCategory } from '@/lib/types/profile'
import { cn } from '@/lib/utils'
import { hasActivityStarted } from '@/src/utils/activityDateTime'
import {
  getCurrentDateInTimezone,
  resolveClientTimezone,
  validateActivityCreationInput,
} from '@/src/utils/activityCreationValidation'

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
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
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([])
  const [interestsLoading, setInterestsLoading] = useState(true)
  const [interestsError, setInterestsError] = useState<string | null>(null)
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
        setSelectedInterests(data.interests ?? [])
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

  const hasRequiredLocation = Boolean(
    selectedPlace?.address &&
      Number.isFinite(selectedPlace.latitude) &&
      Number.isFinite(selectedPlace.longitude) &&
      selectedPlace.placeId,
  )
  const hasRequiredTags = selectedInterests.length > 0
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
  const locationValidationError =
    semanticValidationError && semanticValidationError.toLowerCase().includes('location')
      ? semanticValidationError
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
        interests: selectedInterests,
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

          <div className="space-y-3">
            <PlaceAutocompleteInput
              required
              value={selectedPlace}
              enableMapSelection
              onPlaceSelected={setSelectedPlace}
              onPlaceCleared={() => setSelectedPlace(null)}
            />
          </div>
          {locationValidationError ? <p className="text-sm text-red-600">{locationValidationError}</p> : null}

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
          {error && !locationValidationError && !scheduleValidationError ? (
            <ErrorBlock title="Couldn't update activity" message={error} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

