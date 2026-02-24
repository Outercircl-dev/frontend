'use server'

import { cookies } from 'next/headers'
import { completeProfileSchema } from '@/lib/validations/profile'
import type { ProfileFormState } from '@/lib/types/profile'

const PROFILE_API_PATH = '/rpc/v1/profile'
const DEFAULT_ERROR = 'Failed to save profile. Please try again.'

async function buildCookieHeader() {
  const cookieStore = await cookies()
  const serialized = cookieStore
    .getAll()
    .map(({ name, value }: { name: string; value: string }) => `${name}=${value}`)
    .join('; ')
  return serialized.length ? serialized : undefined
}

function buildErrorsMap(details: Array<{ field: string; message: string }>) {
  return details.reduce<Record<string, string[]>>((acc, detail) => {
    acc[detail.field] = [...(acc[detail.field] || []), detail.message]
    return acc
  }, {})
}

type ApiErrorBody = {
  message?: string
  details?: Array<{ field: string; message: string }>
}

function toApiErrorBody(value: unknown): ApiErrorBody {
  if (!value || typeof value !== 'object') return {}
  const candidate = value as { message?: unknown; details?: unknown }

  const message =
    typeof candidate.message === 'string' && candidate.message.trim().length > 0
      ? candidate.message
      : undefined

  const details = Array.isArray(candidate.details)
    ? candidate.details.filter(
        (detail): detail is { field: string; message: string } =>
          Boolean(
            detail &&
              typeof detail === 'object' &&
              'field' in detail &&
              'message' in detail &&
              typeof (detail as { field?: unknown }).field === 'string' &&
              typeof (detail as { message?: unknown }).message === 'string'
          )
      )
    : undefined

  return { message, details }
}

async function postProfile(payload: Record<string, unknown>): Promise<ProfileFormState> {
  const cookieHeader = await buildCookieHeader()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const origin = siteUrl || 'http://localhost:3000'
  const url = new URL(PROFILE_API_PATH, origin).toString()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    })

    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const parsedError = toApiErrorBody(body)
      const details = parsedError.details ?? []
      return {
        status: 'error',
        message: parsedError.message || DEFAULT_ERROR,
        errors: details.length ? buildErrorsMap(details) : undefined,
      }
    }

    return {
      status: 'success',
      message: 'Profile saved successfully',
      data: body,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'error', message: 'Request timed out. Please try again.' }
    }
    console.error('completeProfileAction error:', error)
    return { status: 'error', message: DEFAULT_ERROR }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function completeProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const rawData = {
    username: formData.get('username') as string,
    fullName: formData.get('fullName') as string,
    dateOfBirth: formData.get('dateOfBirth') as string,
    gender: formData.get('gender') as string,
    profilePictureUrl: (formData.get('profilePictureUrl') as string | null) || null,
    interests: formData.getAll('interests') as string[],
    bio: (formData.get('bio') as string) || '',
    hobbies: (formData.getAll('hobbies') as string[]).filter(Boolean),
    distanceRadiusKm: Number(formData.get('distanceRadiusKm')) || 25,
    availability: {
      weekday_morning: formData.get('weekday_morning') === 'true',
      weekday_afternoon: formData.get('weekday_afternoon') === 'true',
      weekday_evening: formData.get('weekday_evening') === 'true',
      weekend_anytime: formData.get('weekend_anytime') === 'true',
    },
    acceptedTos: formData.get('acceptedTos') === 'true',
    acceptedGuidelines: formData.get('acceptedGuidelines') === 'true',
    confirmedAge: formData.get('confirmedAge') === 'true',
    confirmedPlatonic: formData.get('confirmedPlatonic') === 'true',
  }

  const parsed = completeProfileSchema.safeParse(rawData)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    const firstError = Object.values(fieldErrors).flat()[0] || 'Please fix the errors below'
    return {
      status: 'error',
      message: firstError,
      errors: fieldErrors as Record<string, string[]>,
    }
  }

  const payload = {
    ...parsed.data,
    profilePictureUrl: rawData.profilePictureUrl,
  }

  return postProfile(payload)
}

export async function saveProfileStepAction(
  step: number,
  data: Record<string, unknown>
): Promise<ProfileFormState> {
  // For now, only the final submit (step 0) is supported through the backend.
  if (step !== 0) {
    return { status: 'error', message: 'Step saving is not supported. Please submit the full profile.' }
  }

  return postProfile(data)
}
