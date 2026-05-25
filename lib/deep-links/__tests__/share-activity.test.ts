// Copyright (c) 2026 Outer Circle. All rights reserved.

import { canUseWebShare, getSharePayload } from '@/lib/deep-links/share-activity'

describe('share activity links', () => {
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

  it('prefers the richest payload supported by canShare', () => {
  const canShare = jest.fn(({ url, title, text }: { url?: string; title?: string; text?: string }) => {
      if (title && text && url) return true
      if (url) return true
      return false
    })

    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: async () => undefined,
        canShare,
      },
    })

    expect(getSharePayload({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).toEqual({
      title: 'Morning run',
      text: 'Check out this OuterCircl activity.',
      url: 'https://app.outercircl.test/activities/123',
    })
  })

  it('falls back to url-only payloads when richer fields are unsupported', () => {
    const canShare = jest.fn(({ url, title, text }: { url?: string; title?: string; text?: string }) => {
      return Boolean(url && !title && !text)
    })

    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: async () => undefined,
        canShare,
      },
    })

    expect(getSharePayload({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).toEqual({
      url: 'https://app.outercircl.test/activities/123',
    })
  })

  it('returns the first payload when canShare is not defined', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: async () => undefined,
      },
    })

    expect(getSharePayload({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).toEqual({
      title: 'Morning run',
      text: 'Check out this OuterCircl activity.',
      url: 'https://app.outercircl.test/activities/123',
    })
  })
})
