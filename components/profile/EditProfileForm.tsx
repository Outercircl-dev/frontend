'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Check, Loader2, X } from 'lucide-react'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { FormProvider, useForm, type Resolver } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { completeProfileAction } from '@/actions/profile/complete-profile-action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { uploadProfileAvatar, validateProfileAvatar } from '@/lib/api/profile-avatar-upload'
import type { InterestCategory, OnboardingFormData, ProfileFormState } from '@/lib/types/profile'
import { availabilityOptions, completeProfileSchema } from '@/lib/validations/profile'

type EditProfileFormProps = {
  initialValues: OnboardingFormData
  categories: InterestCategory[]
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function EditProfileForm({ initialValues, categories }: EditProfileFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUsernameLocked = Boolean(initialValues.username?.trim())

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [formState, setFormState] = useState<ProfileFormState>({ status: 'idle', message: '' })

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(completeProfileSchema) as Resolver<OnboardingFormData>,
    defaultValues: initialValues,
    mode: 'onChange',
  })

  const fullName = form.watch('fullName')
  const avatarUrl = previewUrl || form.watch('profilePictureUrl') || undefined
  const selectedInterests = form.watch('interests')
  const hobbies = form.watch('hobbies')
  const bio = form.watch('bio')
  const availability = form.watch('availability')

  const hobbiesText = useMemo(() => (hobbies || []).join(', '), [hobbies])

  const toggleInterest = (slug: string) => {
    const current = form.getValues('interests')
    if (current.includes(slug)) {
      form.setValue(
        'interests',
        current.filter((value) => value !== slug),
        { shouldValidate: true, shouldDirty: true },
      )
      return
    }
    if (current.length >= 10) {
      return
    }
    form.setValue('interests', [...current, slug], { shouldValidate: true, shouldDirty: true })
  }

  const updateHobbiesFromText = (value: string) => {
    const parsed = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10)
    form.setValue('hobbies', parsed, { shouldDirty: true, shouldValidate: true })
  }

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateProfileAvatar(file)
    if (validationError) {
      alert(validationError)
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const localUrl = URL.createObjectURL(file)
    const previousAvatarUrl = form.getValues('profilePictureUrl')
    setPreviewUrl(localUrl)

    setIsUploading(true)
    try {
      const uploadedUrl = await uploadProfileAvatar(file)
      form.setValue('profilePictureUrl', uploadedUrl, {
        shouldDirty: true,
        shouldTouch: true,
      })
      URL.revokeObjectURL(localUrl)
      setPreviewUrl(null)
    } catch (error) {
      URL.revokeObjectURL(localUrl)
      setPreviewUrl(null)
      form.setValue('profilePictureUrl', previousAvatarUrl, {
        shouldDirty: true,
        shouldTouch: true,
      })
      alert(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarDelete = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    form.setValue('profilePictureUrl', undefined, {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setIsSubmitting(true)
      setFormState({ status: 'loading', message: 'Saving your profile changes...' })
      const profilePictureUrl = form.getValues('profilePictureUrl')

      const formData = new FormData()
      formData.append('username', data.username.trim().toLowerCase())
      formData.append('fullName', data.fullName.trim())
      formData.append('dateOfBirth', data.dateOfBirth)
      formData.append('gender', data.gender)
      if (profilePictureUrl) {
        formData.append('profilePictureUrl', profilePictureUrl)
      }
      data.interests.forEach((interest) => formData.append('interests', interest))
      formData.append('bio', data.bio || '')
      data.hobbies.forEach((hobby) => formData.append('hobbies', hobby))
      formData.append('distanceRadiusKm', String(data.distanceRadiusKm || 25))
      formData.append('weekday_morning', String(data.availability?.weekday_morning ?? false))
      formData.append('weekday_afternoon', String(data.availability?.weekday_afternoon ?? false))
      formData.append('weekday_evening', String(data.availability?.weekday_evening ?? false))
      formData.append('weekend_anytime', String(data.availability?.weekend_anytime ?? false))
      formData.append('acceptedTos', String(data.acceptedTos))
      formData.append('acceptedGuidelines', String(data.acceptedGuidelines))
      formData.append('confirmedAge', String(data.confirmedAge))
      formData.append('confirmedPlatonic', String(data.confirmedPlatonic))

      const result = await completeProfileAction(
        {
          status: 'idle',
          message: '',
        },
        formData,
      )

      if (result.status === 'error') {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            const fieldName = field as keyof OnboardingFormData
            const message = messages?.[0]
            if (message) {
              form.setError(fieldName, { type: 'server', message })
            }
          })
        }

        setFormState({
          status: 'error',
          message: result.message,
          errors: result.errors,
        })
        return
      }

      // Keep the user informed while navigating away.
      setFormState({
        status: 'loading',
        message: 'Profile updated successfully. Redirecting to your profile...',
      })

      if (typeof window !== 'undefined') {
        window.location.assign('/profile')
        return
      }

      router.replace('/profile')
    } catch (error) {
      console.error('Edit profile submit error:', error)
      setFormState({
        status: 'error',
        message: 'An unexpected error occurred while saving your profile.',
      })
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your details, interests, and matching preferences.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => router.push('/profile')}>
          Cancel
        </Button>
      </div>

      {formState.status !== 'idle' ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            formState.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : formState.status === 'error'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-border bg-muted text-muted-foreground'
          }`}
        >
          <p className="font-medium">
            {formState.status === 'loading'
              ? 'Saving changes'
              : formState.status === 'success'
                ? 'Saved'
                : 'There was a problem'}
          </p>
          <p className="mt-1">{formState.message}</p>
        </div>
      ) : null}

      <FormProvider {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 pb-2">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={avatarUrl} alt={fullName || 'Profile'} />
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {fullName ? getInitials(fullName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  {avatarUrl ? (
                    <button
                      type="button"
                      onClick={handleAvatarDelete}
                      disabled={isUploading}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="edit-avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {avatarUrl ? 'Change photo' : 'Add photo'}
                </Button>
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        readOnly={isUsernameLocked}
                        {...field}
                        value={field.value || ''}
                        className={isUsernameLocked ? 'bg-muted/40' : undefined}
                        onChange={async (event) => {
                          field.onChange(event)
                          if (isUsernameLocked) {
                            return
                          }

                          const value = event.target.value.trim().toLowerCase()
                          const usernameRegex = /^[a-z0-9_]{3,15}$/
                          setUsernameAvailable(null)
                          setIsCheckingUsername(false)

                          if (!value || !usernameRegex.test(value)) {
                            return
                          }

                          setIsCheckingUsername(true)
                          try {
                            const response = await fetch(
                              `/rpc/v1/profile/username-availability?username=${encodeURIComponent(value)}`,
                            )
                            const payload = await response.json()
                            if (!response.ok) {
                              form.setError('username', {
                                type: 'server',
                                message: payload?.message || 'Unable to validate username right now',
                              })
                              return
                            }

                            if (payload?.available) {
                              setUsernameAvailable(true)
                              const currentError = form.getFieldState('username').error
                              if (currentError?.type === 'server') {
                                form.clearErrors('username')
                              }
                              return
                            }

                            setUsernameAvailable(false)
                            form.setError('username', {
                              type: 'server',
                              message: 'Username is already taken',
                            })
                          } catch {
                            form.setError('username', {
                              type: 'server',
                              message: 'Unable to validate username right now',
                            })
                          } finally {
                            setIsCheckingUsername(false)
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {isUsernameLocked
                        ? 'Username cannot be changed after profile creation.'
                        : 'Set your username once. You will not be able to change it later.'}
                    </FormDescription>
                    {!isUsernameLocked ? (
                      isCheckingUsername ? (
                        <p className="text-xs text-muted-foreground">Checking username availability...</p>
                      ) : usernameAvailable === true ? (
                        <p className="text-xs text-emerald-600">Username is available.</p>
                      ) : null
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of birth *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={selectedInterests.length >= 3 ? 'default' : 'secondary'}>
                  {selectedInterests.length} selected
                </Badge>
                <span className="text-sm text-muted-foreground">Choose between 3 and 10 interests.</span>
              </div>
              <FormField
                control={form.control}
                name="interests"
                render={() => <FormMessage />}
              />
              <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
                {categories.map((category) => (
                  <div key={category.name} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {category.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {category.interests.map((interest) => {
                        const isSelected = selectedInterests.includes(interest.slug)
                        const isDisabled = !isSelected && selectedInterests.length >= 10
                        return (
                          <button
                            key={interest.slug}
                            type="button"
                            onClick={() => toggleInterest(interest.slug)}
                            disabled={isDisabled}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
                            } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            <span>{interest.icon}</span>
                            <span>{interest.name}</span>
                            {isSelected ? <Check className="h-4 w-4" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell others a bit about yourself..."
                        className="min-h-[110px] resize-none"
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between">
                      <FormDescription>Short intro shown on your public profile</FormDescription>
                      <span className="text-xs text-muted-foreground">{bio?.length || 0}/500</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="hobbies-input">Hobbies (optional)</Label>
                <Input
                  id="hobbies-input"
                  value={hobbiesText}
                  onChange={(event) => updateHobbiesFromText(event.target.value)}
                  placeholder="e.g. pottery, tennis, reading"
                />
                <p className="text-xs text-muted-foreground">
                  Enter hobbies separated by commas (maximum 10).
                </p>
              </div>

              <FormField
                control={form.control}
                name="distanceRadiusKm"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Activity distance</FormLabel>
                      <span className="text-sm font-medium text-primary">{field.value} km</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="py-4"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Label>Availability (optional)</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availabilityOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={Boolean(availability?.[option.id])}
                        onCheckedChange={(checked) =>
                          form.setValue(`availability.${option.id}`, Boolean(checked), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy confirmations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="acceptedTos"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel>I agree to the Terms of Service</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptedGuidelines"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel>I agree to the Community Guidelines</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmedAge"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel>I confirm that I am at least 18 years old</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmedPlatonic"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel>I understand OuterCircl is for platonic connections</FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || isUploading} className="min-w-36">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
