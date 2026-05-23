// Copyright (c) 2026 Outer Circle. All rights reserved.

import { buildActivityDeepLinkUrl, getActivityDeepLinkPath } from '@/lib/deep-links/activity'

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

})
