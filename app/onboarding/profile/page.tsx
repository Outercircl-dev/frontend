'use client'

import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import Image from 'next/image'

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
import { defaultProfileValues } from '@/lib/validations/profile'
import type { OnboardingFormData, InterestCategory, ProfileFormState } from '@/lib/types/profile'

export default function OnboardingProfilePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [categories, setCategories] = useState<InterestCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<ProfileFormState>({
    status: 'idle',
    message: '',
  })

  const form = useForm<OnboardingFormData>({
    defaultValues: defaultProfileValues,
    mode: 'onBlur',
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

      // Use server action - it will redirect on success
      await completeProfileAction(
        {
          status: 'idle',
          message: '',
        },
        formData
      )
      // If we reach here, there was an error (redirect would have happened otherwise)
      setFormState({
        status: 'error',
        message: 'Failed to save profile. Please try again.',
      })
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
            {formState.status === 'error' && formState.message && (
              <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {formState.message}
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

