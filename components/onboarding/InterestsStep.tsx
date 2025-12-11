'use client'

import { UseFormReturn } from 'react-hook-form'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OnboardingFormData, InterestCategory } from '@/lib/types/profile'

interface InterestsStepProps {
  form: UseFormReturn<OnboardingFormData>
  categories: InterestCategory[]
  onNext: () => void
  onBack: () => void
}

export function InterestsStep({ form, categories, onNext, onBack }: InterestsStepProps) {
  const selectedInterests = form.watch('interests')

  const toggleInterest = (slug: string) => {
    const current = form.getValues('interests')
    if (current.includes(slug)) {
      form.setValue(
        'interests',
        current.filter((i) => i !== slug),
        { shouldValidate: true }
      )
    } else if (current.length < 10) {
      form.setValue('interests', [...current, slug], { shouldValidate: true })
    }
  }

  const handleSubmit = async () => {
    const isValid = await form.trigger(['interests'])
    if (isValid) {
      onNext()
    }
  }

  const error = form.formState.errors.interests?.message

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">What are you into?</h2>
        <p className="text-muted-foreground">
          Select at least 3 interests to help us find activities you&apos;ll love.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Badge variant={selectedInterests.length >= 3 ? 'default' : 'secondary'}>
          {selectedInterests.length} selected
        </Badge>
        <span className="text-sm text-muted-foreground">
          {selectedInterests.length < 3
            ? `Select ${3 - selectedInterests.length} more`
            : selectedInterests.length < 10
              ? `${10 - selectedInterests.length} more available`
              : 'Maximum reached'}
        </span>
      </div>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <div className="max-h-[400px] space-y-6 overflow-y-auto pr-2">
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
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5',
                      isDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span>{interest.icon}</span>
                    <span>{interest.name}</span>
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={selectedInterests.length < 3}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

