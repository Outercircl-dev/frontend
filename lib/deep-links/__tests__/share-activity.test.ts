// Copyright (c) 2026 Outer Circle. All rights reserved.

import { canUseWebShare } from '@/lib/deep-links/share-activity'

describe('canUseWebShare', () => {
  const originalNavigator = global.navigator

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    })
  })

  it('returns false when navigator.share is unavailable', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {},
    })

    expect(canUseWebShare('https://app.outercircl.test/activities/123')).toBe(false)
  })

  it('returns true when navigator.share exists and canShare is not defined', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: async () => undefined,
      },
    })

    expect(canUseWebShare('https://app.outercircl.test/activities/123')).toBe(true)
  })
})
