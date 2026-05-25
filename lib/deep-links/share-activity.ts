// Copyright (c) 2026 Outer Circle. All rights reserved.

import { copyTextToClipboard } from '@/lib/copy-to-clipboard'

type ShareActivityInput = {
  title: string
  url: string
}

export function canUseWebShare(url: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  if (typeof navigator.canShare !== 'function') {
    return true
  }

  try {
    return navigator.canShare({ url })
  } catch {
    return true
  }
}

export async function shareActivityLink(input: ShareActivityInput): Promise<'shared' | 'copied' | 'failed'> {
  if (canUseWebShare(input.url)) {
    try {
      await navigator.share({
        title: input.title,
        text: 'Check out this OuterCircl activity.',
        url: input.url,
      })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
    }
  }

  const copied = await copyTextToClipboard(input.url)
  return copied ? 'copied' : 'failed'
}
