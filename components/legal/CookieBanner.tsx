'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

const COOKIE_BANNER_KEY = 'oc_cookie_banner_acknowledged'

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.localStorage.getItem(COOKIE_BANNER_KEY) !== 'true'
  })

  const handleAcknowledge = () => {
    window.localStorage.setItem(COOKIE_BANNER_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 py-4 shadow-lg backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="leading-relaxed">
          By using OuterCircl, you consent to our collection and processing of usage data for analytics,
          safety, and product improvement. See our{' '}
          <Link href="/terms-and-conditions" className="font-medium text-foreground underline underline-offset-2">
            Terms &amp; Conditions
          </Link>{' '}
          and{' '}
          <Link href="/privacy-policy" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <Button type="button" size="sm" onClick={handleAcknowledge}>
          I understand
        </Button>
      </div>
    </div>
  )
}
