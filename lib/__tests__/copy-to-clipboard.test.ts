// Copyright (c) 2026 Outer Circle. All rights reserved.

import { copyTextToClipboard } from '@/lib/copy-to-clipboard'

describe('copyTextToClipboard', () => {
  it('returns false for empty text', async () => {
    await expect(copyTextToClipboard('')).resolves.toBe(false)
  })
})
