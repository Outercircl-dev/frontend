'use client'

import { useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Camera, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { OnboardingFormData } from '@/lib/types/profile'

interface BasicInfoStepProps {
  form: UseFormReturn<OnboardingFormData>
  onNext: () => void
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function BasicInfoStep({ form, onNext }: BasicInfoStepProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarUrl = form.watch('profilePictureUrl') || previewUrl || undefined
  const fullName = form.watch('fullName')

  // Handle local preview - actual upload happens when profile is saved
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    setIsUploading(true)

    // Create local preview URL
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    
    // Store file info for later upload (we'll handle actual upload when saving profile)
    // For now, we just show a preview
    form.setValue('profilePictureUrl', localUrl)

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAvatarDelete = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    form.setValue('profilePictureUrl', undefined)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async () => {
    const isValid = await form.trigger(['fullName', 'dateOfBirth', 'gender'])
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Let&apos;s get to know you</h2>
        <p className="text-muted-foreground">
          Tell us a bit about yourself so we can personalize your experience.
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={avatarUrl} alt={fullName || 'Profile'} />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {fullName ? getInitials(fullName) : '?'}
            </AvatarFallback>
          </Avatar>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleAvatarDelete}
              disabled={isUploading}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            id="avatar-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {avatarUrl ? 'Change Photo' : 'Add Photo'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Optional · Max 5MB</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
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
              <FormLabel>Date of Birth *</FormLabel>
              <FormControl>
                <Input type="date" max={getMaxDate()} {...field} />
              </FormControl>
              <FormDescription>You must be at least 18 years old</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
      </div>

      <Button type="button" onClick={handleSubmit} className="w-full">
        Continue
      </Button>
    </div>
  )
}

function getMaxDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date.toISOString().split('T')[0]
}

