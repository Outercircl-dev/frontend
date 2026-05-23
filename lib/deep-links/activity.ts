// Copyright (c) 2026 Outer Circle. All rights reserved.

export function getActivityDeepLinkPath(activityId: string): string {
  return `/activities/${encodeURIComponent(activityId)}`
}

export function buildActivityDeepLinkUrl(activityId: string, origin: string): string {
  return new URL(getActivityDeepLinkPath(activityId), normalizeOrigin(origin)).toString()
}

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim()
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}
