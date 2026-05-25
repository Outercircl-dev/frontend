// Copyright (c) 2026 Outer Circle. All rights reserved.

import {
  buildSharePayloadCandidates,
  canUseWebShare,
  isNativeShareAvailable,
  openNativeShareSheet,
} from '@/lib/deep-links/share-activity'

describe('share activity links', () => {
  const originalNavigator = global.navigator
  const originalWindow = global.window

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    })
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: originalWindow,
    })
  })

  it('returns false when navigator.share is unavailable', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {},
    })

    expect(canUseWebShare()).toBe(false)
  })

  it('prefers url-only payloads first for mobile compatibility', () => {
    expect(buildSharePayloadCandidates({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })[0]).toEqual({
      url: 'https://app.outercircl.test/activities/123',
    })
  })

  it('returns unavailable when native share is not supported', async () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {},
    })

    await expect(openNativeShareSheet({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).resolves.toBe('unavailable')
  })

  it('tries simpler payloads after richer payloads fail', async () => {
    const share = jest.fn()
      .mockRejectedValueOnce(new DOMException('Invalid share data', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined)

    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share,
      },
    })

    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        ...originalWindow,
        isSecureContext: true,
      },
    })

    await expect(openNativeShareSheet({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).resolves.toBe('shared')

    expect(share).toHaveBeenCalledTimes(2)
    expect(share.mock.calls[0][0]).toEqual({
      url: 'https://app.outercircl.test/activities/123',
    })
    expect(share.mock.calls[1][0]).toEqual({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })
  })

  it('returns cancelled when the user dismisses the share sheet', async () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: jest.fn().mockRejectedValue(new DOMException('Share cancelled', 'AbortError')),
      },
    })

    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        ...originalWindow,
        isSecureContext: true,
      },
    })

    await expect(openNativeShareSheet({
      title: 'Morning run',
      url: 'https://app.outercircl.test/activities/123',
    })).resolves.toBe('cancelled')
  })

  it('requires a secure context for native sharing', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        share: async () => undefined,
      },
    })

    Object.defineProperty(global, 'window', {
      configurable: true,
      value: {
        ...originalWindow,
        isSecureContext: false,
      },
    })

    expect(isNativeShareAvailable()).toBe(false)
  })
})
