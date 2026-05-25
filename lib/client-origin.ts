// Copyright (c) 2026 Outer Circle. All rights reserved.

export function getClientOrigin(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.location.origin
}
