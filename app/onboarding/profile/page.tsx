'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { saveProfileFromClient } from '@/lib/supabase/client-actions'
import {
  defaultProfileValues,
  basicInfoSchema,
  interestsSchema,
  preferencesSchema,
} from '@/lib/validations/profile'
import type { OnboardingFormData, InterestCategory } from '@/lib/types/profile'

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [categories, setCategories] = useState<InterestCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<OnboardingFormData>({
    defaultValues: defaultProfileValues,
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

  const handleNext = async () => {
    // Per-step validation - only validate fields for the current step
    if (currentStep === 1) {
      // Validate step 1: Basic Info fields using Zod schema
      const formData = form.getValues()
      const step1Data = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      }
      const result = basicInfoSchema.safeParse(step1Data)
      if (!result.success) {
        // Set errors for the fields that failed validation
        result.error.errors.forEach((error) => {
          form.setError(error.path[0] as keyof OnboardingFormData, {
            type: 'manual',
            message: error.message,
          })
        })
        return
      }
      // Also trigger form validation to ensure React Hook Form state is updated
      const isValid = await form.trigger(['fullName', 'dateOfBirth', 'gender'])
      if (!isValid) {
        return
      }
    } else if (currentStep === 2) {
      // Validate step 2: Interests using Zod schema
      const formData = form.getValues()
      const step2Data = {
        interests: formData.interests,
      }
      const result = interestsSchema.safeParse(step2Data)
      if (!result.success) {
        result.error.errors.forEach((error) => {
          form.setError(error.path[0] as keyof OnboardingFormData, {
            type: 'manual',
            message: error.message,
          })
        })
        return
      }
      // Also trigger form validation to ensure React Hook Form state is updated
      const isValid = await form.trigger(['interests'])
      if (!isValid) {
        return
      }
    } else if (currentStep === 3) {
      // Validate step 3: Preferences using Zod schema
      const formData = form.getValues()
      const step3Data = {
        distanceRadiusKm: formData.distanceRadiusKm,
        availability: formData.availability,
        bio: formData.bio,
        hobbies: formData.hobbies,
      }
      const result = preferencesSchema.safeParse(step3Data)
      if (!result.success) {
        result.error.errors.forEach((error) => {
          form.setError(error.path[0] as keyof OnboardingFormData, {
            type: 'manual',
            message: error.message,
          })
        })
        return
      }
      // Also trigger form validation to ensure React Hook Form state is updated
      const isValid = await form.trigger(['distanceRadiusKm', 'availability'])
      if (!isValid) {
        return
      }
    }
    // Move to next step only if validation passes
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // try {
    //   const data = form.getValues()

    //   // Use client-side save (more reliable for auth)
    //   const result = await saveProfileFromClient({
    //     fullName: data.fullName,
    //     dateOfBirth: data.dateOfBirth,
    //     gender: data.gender,
    //     profilePictureUrl: data.profilePictureUrl || null,
    //     interests: data.interests,
    //     bio: data.bio || null,
    //     hobbies: data.hobbies || [],
    //     distanceRadiusKm: data.distanceRadiusKm || 25,
    //     availability: data.availability || {},
    //   })

    //   if (result.success) {
    //     router.push('/feed')
    //   } else {
    //     console.error('Profile save failed:', result.error)
    //     alert('Failed to save profile: ' + result.error)
    //   }
    // } catch (error) {
    //   console.error('Submit error:', error)
    //   alert('An error occurred while saving your profile.')
    // } finally {
    //   setIsSubmitting(false)
    // }

    // 1. Create an endpoint on backend for saving interests
    // 2. Send a Form Action (follow verify-email-action.ts)
    // 3. Using form action send the data to backend for storing
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

