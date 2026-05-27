// Copyright (c) 2026 Outer Circle. All rights reserved.

import { OnboardingProfilePage } from '@/components/onboarding/onboarding-profile-page'
import { sanitizeReturnUrl } from '@/lib/auth/return-url'

interface OnboardingProfilePageProps {
  searchParams: Promise<{ returnUrl?: string | string[] }>
}

export default async function OnboardingProfileRoute({
  searchParams,
}: OnboardingProfilePageProps) {
  const params = await searchParams
  const returnUrlValue = params.returnUrl
  const returnUrlRaw = Array.isArray(returnUrlValue) ? returnUrlValue[0] : returnUrlValue
  const returnUrl = sanitizeReturnUrl(returnUrlRaw)

  return <OnboardingProfilePage returnUrl={returnUrl} />
}
