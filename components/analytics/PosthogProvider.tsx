'use client'

import { useEffect, type ReactNode } from 'react'

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
      <PosthogPageview />
      {children}
    </>
  )
}
