// Copyright (c) 2026 Outer Circle. All rights reserved.

import { copyTextToClipboard } from '@/lib/copy-to-clipboard'

type ShareActivityInput = {
  title: string
  url: string
}

type SharePayload = {
  title?: string
  text?: string
  url?: string
}

const SHARE_TEXT = 'Check out this OuterCircl activity.'

function canSharePayload(payload: SharePayload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  if (typeof navigator.canShare !== 'function') {
    return true
  }

  try {
    return navigator.canShare(payload)
  } catch {
    return false
  }
}

export function getSharePayload(input: ShareActivityInput): SharePayload | null {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return null
  }

  const candidates: SharePayload[] = [
    { title: input.title, text: SHARE_TEXT, url: input.url },
    { title: input.title, url: input.url },
    { text: SHARE_TEXT, url: input.url },
    { url: input.url },
  ]

  for (const payload of candidates) {
    if (canSharePayload(payload)) {
      return payload
    }
  }

  return null
}

export function canUseWebShare(url: string): boolean {
  return getSharePayload({ title: 'Activity', url }) !== null
}

export async function shareActivityLink(input: ShareActivityInput): Promise<'shared' | 'copied' | 'failed'> {
  const payload = getSharePayload(input)

  if (payload) {
    try {
      await navigator.share(payload)
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
