// Copyright (c) 2026 Outer Circle. All rights reserved.

'use client'

import { getPosthogClient } from '@/lib/analytics/posthog-client'

export function trackAuthCompleted(intent: 'signin' | 'signup') {
  getPosthogClient().capture('auth_link_requested', { intent })
}

export function trackActivityJoined(activityId: string) {
  getPosthogClient().capture('activity_joined', { activityId })
}

export function trackActivityCreated(activityId: string) {
  getPosthogClient().capture('activity_created', { activityId })
}
