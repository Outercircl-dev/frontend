// Copyright (c) 2026 Outer Circle. All rights reserved.

import {
  buildActivityDeepLinkUrl,
  buildActivityShareEmailHref,
  getActivityDeepLinkPath,
  shouldUseNativeActivityShare,
} from '@/lib/deep-links/activity'

describe('activity deep links', () => {
  it('builds a deterministic app path from the activity id', () => {
    expect(getActivityDeepLinkPath('activity-123')).toBe('/activities/activity-123')
  })

  it('encodes activity ids when building paths', () => {
    expect(getActivityDeepLinkPath('activity 123')).toBe('/activities/activity%20123')
  })

  it('builds an absolute URL from the app origin', () => {
    expect(buildActivityDeepLinkUrl('activity-123', 'https://app.outercircl.test')).toBe(
      'https://app.outercircl.test/activities/activity-123',
    )
  })

  it('pre-populates the email subject and body with the deep link', () => {
    const href = buildActivityShareEmailHref({
      activityId: 'activity-123',
      activityTitle: 'Morning Run',
      origin: 'https://app.outercircl.test',
    })

    expect(href).toContain('subject=OuterCircl+activity%3A+Morning+Run')
    expect(href).toContain('https%3A%2F%2Fapp.outercircl.test%2Factivities%2Factivity-123')
  })

  it('uses native sharing on mobile browsers', () => {
    expect(
      shouldUseNativeActivityShare({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      }),
    ).toBe(true)
  })

  it('uses native sharing for iPadOS desktop-mode user agents', () => {
    expect(
      shouldUseNativeActivityShare({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('does not use native sharing on Windows desktop browsers', () => {
    expect(
      shouldUseNativeActivityShare({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
      }),
    ).toBe(false)
  })
})
