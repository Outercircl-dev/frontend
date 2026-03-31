// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { useEffect, useState } from 'react'

import type { Gender, UserProfile } from '@/lib/types/profile'

export function useViewerGender(userId?: string | null): Gender | null {
  const [gender, setGender] = useState<Gender | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfileGender() {
      if (!userId) {
        setGender(null)
        return
      }

      try {
        const response = await fetch('/rpc/v1/profile', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok || cancelled) return
        const payload = (await response.json()) as UserProfile
        if (!cancelled) {
          setGender(payload.gender ?? null)
        }
      } catch {
        if (!cancelled) {
          setGender(null)
        }
      }
    }

    void loadProfileGender()
    return () => {
      cancelled = true
    }
  }, [userId])

  return gender
}
