'use client'

import { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { OnboardingFormData } from '@/lib/types/profile'
import { availabilityOptions } from '@/lib/validations/profile'

interface PreferencesStepProps {
  form: UseFormReturn<OnboardingFormData>
  onNext: () => void
  onBack: () => void
}

export function PreferencesStep({ form, onNext, onBack }: PreferencesStepProps) {
  const distanceValue = form.watch('distanceRadiusKm')
  const bioValue = form.watch('bio')

  const handleSubmit = async () => {
    const isValid = await form.trigger(['bio', 'distanceRadiusKm', 'availability'])
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Your preferences</h2>
        <p className="text-muted-foreground">
          Help us tailor activity recommendations to your schedule and location.
        </p>
      </div>

      <div className="space-y-6">
        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell others a bit about yourself..."
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between">
                <FormDescription>A short intro visible to activity hosts</FormDescription>
                <span className="text-xs text-muted-foreground">
                  {bioValue?.length || 0}/500
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Distance Radius */}
        <FormField
          control={form.control}
          name="distanceRadiusKm"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Activity Distance</FormLabel>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
              <FormDescription>
                Show activities within this distance from your location
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Availability */}
        <div className="space-y-3">
          <Label>Availability (optional)</Label>
          <p className="text-sm text-muted-foreground">
            When are you typically free for activities?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {availabilityOptions.map((option) => (
              <FormField
                key={option.id}
                control={form.control}
                name={`availability.${option.id}` as keyof OnboardingFormData}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 hover:bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer font-normal">{option.label}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="button" onClick={handleSubmit} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}

