'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['Basic Info', 'Interests', 'Preferences', 'Guidelines']

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-sm font-medium text-foreground">{STEP_LABELS[currentStep - 1]}</p>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-center gap-1',
              index + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                index + 1 < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index + 1 === currentStep
                    ? 'border-2 border-primary bg-background text-primary'
                    : 'border-2 border-muted bg-background text-muted-foreground'
              )}
            >
              {index + 1 < currentStep ? '✓' : index + 1}
            </div>
            <span className="hidden text-xs sm:block">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

