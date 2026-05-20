// Copyright (c) 2026 Outer Circle. All rights reserved.

export function getActivityDeepLinkPath(activityId: string): string {
  return `/activities/${encodeURIComponent(activityId)}`
}

export function buildActivityDeepLinkUrl(activityId: string, origin: string): string {
  return new URL(getActivityDeepLinkPath(activityId), normalizeOrigin(origin)).toString()
}

export function buildActivityShareEmailHref(input: {
  activityId: string
  activityTitle: string
  origin: string
}): string {
  const deepLinkUrl = buildActivityDeepLinkUrl(input.activityId, input.origin)
  const params = new URLSearchParams({
    subject: `OuterCircl activity: ${input.activityTitle}`,
    body: `Open this OuterCircl activity:\n\n${deepLinkUrl}`,
  })

  return `mailto:?${params.toString()}`
}

export function shouldUseNativeActivityShare(input: {
  userAgent: string
  maxTouchPoints?: number
}): boolean {
  const userAgent = input.userAgent.toLowerCase()
  const isMobilePlatform = /android|iphone|ipad|ipod/.test(userAgent)
  const isIpadOsDesktopMode =
    userAgent.includes('macintosh') && (input.maxTouchPoints ?? 0) > 1

  return isMobilePlatform || isIpadOsDesktopMode
}

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim()
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}
