'use client'

import { Suspense, useEffect, type ReactNode } from 'react'

import { initPosthog } from '@/lib/analytics/posthog-client'
import { PosthogPageview } from '@/components/analytics/PosthogPageview'

interface PosthogProviderProps {
  children: ReactNode
}

export function PosthogProvider({ children }: PosthogProviderProps) {
  useEffect(() => {
    initPosthog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PosthogPageview />
      </Suspense>
      {children}
    </>
  )
}
