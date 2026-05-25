'use client'

// Copyright (c) 2026 Outer Circle. All rights reserved.

import { useSyncExternalStore } from 'react'

function subscribeToClientOrigin(_onStoreChange: () => void) {
  return () => {}
}

export function useClientOrigin(): string | null {
  return useSyncExternalStore(
    subscribeToClientOrigin,
    () => window.location.origin,
    () => null,
  )
}
