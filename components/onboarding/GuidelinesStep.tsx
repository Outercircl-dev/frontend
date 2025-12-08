'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Loader2, Shield, Heart, Users, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import type { OnboardingFormData } from '@/lib/types/profile'

interface GuidelinesStepProps {
  form: UseFormReturn<OnboardingFormData>
  onSubmit: () => Promise<void>
  onBack: () => void
  isSubmitting: boolean
}

const GUIDELINES = [
  {
    id: 'confirmedAge',
    label: 'I confirm that I am at least 18 years old',
    icon: Shield,
    description: 'OuterCircl is an adults-only platform for safety reasons.',
  },
  {
    id: 'acceptedTos',
    label: 'I agree to the Terms of Service',
    icon: AlertCircle,
    description: 'Please read and accept our terms before using the platform.',
    link: '/terms',
  },
  {
    id: 'acceptedGuidelines',
    label: 'I agree to the Community Guidelines',
    icon: Users,
    description: 'Be respectful, inclusive, and help keep our community safe.',
    link: '/guidelines',
  },
  {
    id: 'confirmedPlatonic',
    label: 'I understand OuterCircl is for platonic connections',
    icon: Heart,
    description:
      'Our platform is designed to help you make genuine friendships, not romantic relationships.',
  },
] as const

export function GuidelinesStep({ form, onSubmit, onBack, isSubmitting }: GuidelinesStepProps) {
  const allChecked =
    form.watch('confirmedAge') &&
    form.watch('acceptedTos') &&
    form.watch('acceptedGuidelines') &&
    form.watch('confirmedPlatonic')

  const handleSubmit = async () => {
    const isValid = await form.trigger([
      'confirmedAge',
      'acceptedTos',
      'acceptedGuidelines',
      'confirmedPlatonic',
    ])
    if (isValid) {
      await onSubmit()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Almost there!</h2>
        <p className="text-muted-foreground">
          Please review and accept our community guidelines to complete your profile.
        </p>
      </div>

      <div className="space-y-4">
        {GUIDELINES.map((guideline) => {
          const Icon = guideline.icon
          return (
            <FormField
              key={guideline.id}
              control={form.control}
              name={guideline.id as keyof OnboardingFormData}
              render={({ field }) => (
                <FormItem
                  className={cn(
                    'flex items-start space-x-4 rounded-xl border p-4 transition-colors',
                    field.value ? 'border-primary/50 bg-primary/5' : 'hover:bg-muted/50'
                  )}
                >
                  <FormControl>
                    <Checkbox
                      checked={field.value as boolean}
                      onCheckedChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <FormLabel className="cursor-pointer font-medium">
                        {guideline.label}
                      </FormLabel>
                    </div>
                    <p className="text-sm text-muted-foreground">{guideline.description}</p>
                    {'link' in guideline && (
                      <a
                        href={guideline.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read more →
                      </a>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        })}
      </div>

      <div className="rounded-xl bg-muted/50 p-4">
        <p className="text-center text-sm text-muted-foreground">
          By completing your profile, you&apos;re joining a community of people looking to make
          genuine, platonic connections through shared activities. Welcome to OuterCircl! 🎉
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!allChecked || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </div>
    </div>
  )
}

