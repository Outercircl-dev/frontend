// Copyright (c) 2026 Outer Circle. All rights reserved.

import { fetchJson, getErrorMessage } from '@/lib/api/fetch-json'

export async function deleteActivityByHost(activityId: string): Promise<void> {
  await fetchJson<unknown>(
    `/rpc/v1/activities/${activityId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
    'Failed to delete activity',
  )
}

export function getDeleteActivityErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, 'Failed to delete activity')
  if (/already started|can no longer be deleted|vault/i.test(message)) {
    return 'This activity has already started and can no longer be deleted.'
  }
  if (/only delete your own activities|not authorized|forbidden/i.test(message)) {
    return 'You can only delete activities that you host.'
  }
  return message
}
