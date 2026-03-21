'use client'

import posthog from 'posthog-js'

let hasInitialized = false

export function initPosthog() {
  if (typeof window === 'undefined' || hasInitialized) {
    return
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!posthogKey || !posthogHost) {
    return
  }

  hasInitialized = true
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    autocapture: true,
  })
}

export function getPosthogClient() {
  return posthog
}
