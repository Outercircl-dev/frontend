// Copyright (c) 2026 Outer Circle. All rights reserved.

import { toast } from 'sonner'

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

export type NativeShareResult = 'shared' | 'cancelled' | 'unavailable' | 'failed'

export function buildSharePayloadCandidates(input: ShareActivityInput): SharePayload[] {
  return [
    { url: input.url },
    { title: input.title, url: input.url },
    { text: SHARE_TEXT, url: input.url },
    { title: input.title, text: SHARE_TEXT, url: input.url },
  ]
}

export function isNativeShareAvailable(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return false
  }

  return true
}

export function canUseWebShare(): boolean {
  return isNativeShareAvailable()
}

export async function openNativeShareSheet(input: ShareActivityInput): Promise<NativeShareResult> {
  if (!isNativeShareAvailable()) {
    return 'unavailable'
  }

  for (const payload of buildSharePayloadCandidates(input)) {
    if (typeof navigator.canShare === 'function') {
      try {
        if (!navigator.canShare(payload)) {
          continue
        }
      } catch {
        continue
      }
    }

    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  return 'failed'
}

export function notifyNativeShareResult(result: NativeShareResult): void {
  if (result === 'unavailable') {
    toast.error("Native sharing isn't available in this browser. Use Copy link instead.")
    return
  }

  if (result === 'failed') {
    toast.error("Couldn't open the share panel. Use Copy link instead.")
  }
}
