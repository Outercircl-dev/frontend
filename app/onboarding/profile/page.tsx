'use client'

import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { Card, CardContent } from '@/components/ui/card'
import {
  OnboardingProgress,
  BasicInfoStep,
  InterestsStep,
  PreferencesStep,
  GuidelinesStep,
} from '@/components/onboarding'
import { getInterestsAction } from '@/actions/profile'
import { completeProfileAction } from '@/actions/profile/complete-profile-action'
import { completeProfileSchema, defaultProfileValues } from '@/lib/validations/profile'
import type {
  OnboardingFormData,
  InterestCategory,
  ProfileFormState,
  UserProfile,
} from '@/lib/types/profile'

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [categories, setCategories] = useState<InterestCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<ProfileFormState>({
    status: 'idle',
    message: '',
  })
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null)

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: defaultProfileValues,
    mode: 'onChange',
  })

  useEffect(() => {
    async function loadInterests() {
      const result = await getInterestsAction()
      if (result.categories) {
        setCategories(result.categories)
      }
      setIsLoading(false)
    }
    loadInterests()
  }, [])

  const handleNext = () => {
    // Just move to next step - we'll save everything at the end
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      setFormState({
        status: 'error',
        message: 'Please fix the highlighted fields before submitting.',
      })
      return
    }

    setIsSubmitting(true)
    setFormState({
      status: 'loading',
      message: 'Saving your profile...',
      errors: undefined,
    })
    try {
      const data = form.getValues()
      const formData = new FormData()
      formData.append('username', data.username.trim().toLowerCase())
      formData.append('fullName', data.fullName.trim())
      formData.append('dateOfBirth', data.dateOfBirth)
      formData.append('gender', data.gender)
      if (data.profilePictureUrl) {
        formData.append('profilePictureUrl', data.profilePictureUrl)
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
        formData
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

      const profile = (result.data ?? null) as UserProfile | null
      if (profile) {
        setSavedProfile(profile)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastProfileResponse', JSON.stringify(profile))
        }
      }

      setFormState({
        status: 'success',
        message: 'Profile saved successfully!',
      })
      router.push('/profile')
    } catch (error) {
      console.error('Submit error:', error)
      setFormState({
        status: 'error',
        message: 'An unexpected error occurred while saving your profile.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="animate-pulse text-center">
          <div className="h-8 w-32 rounded bg-muted mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="OuterCircl"
            width={140}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <OnboardingProgress currentStep={currentStep} totalSteps={4} />
        </div>

        {/* Form Card */}
        <Card className="border-none shadow-xl">
          <CardContent className="p-6 sm:p-8">
            {formState.status !== 'idle' && (
              <div
                className={`mb-4 rounded-lg border p-4 text-sm ${formState.status === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : formState.status === 'error'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-border bg-muted text-muted-foreground'
                  }`}
              >
                <div className="font-medium">
                  {formState.status === 'success'
                    ? 'Success'
                    : formState.status === 'error'
                      ? 'There was a problem'
                      : 'Working on it'}
                </div>
                <div className="mt-1 text-sm">{formState.message}</div>
                {formState.status === 'success' && savedProfile && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Saved profile for {savedProfile.full_name}. Ready for the profile page.
                  </div>
                )}
              </div>
            )}

            <FormProvider {...form}>
              <form onSubmit={(e) => e.preventDefault()}>
                {currentStep === 1 && <BasicInfoStep form={form} onNext={handleNext} />}
                {currentStep === 2 && (
                  <InterestsStep
                    form={form}
                    categories={categories}
                    onNext={handleNext}
                    onBack={handleBack}
                  />
                )}
                {currentStep === 3 && (
                  <PreferencesStep form={form} onNext={handleNext} onBack={handleBack} />
                )}
                {currentStep === 4 && (
                  <GuidelinesStep
                    form={form}
                    onSubmit={handleSubmit}
                    onBack={handleBack}
                    isSubmitting={isSubmitting}
                  />
                )}
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Having issues?{' '}
          <a
            href="mailto:support@outercircl.com"
            className="font-medium text-foreground hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}

