'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { getPosthogClient } from '@/lib/analytics/posthog-client'

export function PosthogPageview() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) {
      return
    }

    const queryString = searchParams.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname

    getPosthogClient().capture('$pageview', {
      $current_url: url,
      pathname,
    })
  }, [pathname, searchParams])

  return null
}
