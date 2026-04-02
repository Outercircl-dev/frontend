// Copyright (c) 2026 Outer Circle. All rights reserved.

import { ApiError } from '@/lib/errors/api-error'
import { deleteActivityByHost, getDeleteActivityErrorMessage } from '@/lib/api/activity-management'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('activity-management API helpers', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('deletes an activity with DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await deleteActivityByHost('activity-123')

    expect(mockFetch).toHaveBeenCalledWith('/rpc/v1/activities/activity-123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('normalizes started-activity backend errors', () => {
    const error = new ApiError('Activity has already started and can no longer be deleted', 403)
    expect(getDeleteActivityErrorMessage(error)).toBe(
      'This activity has already started and can no longer be deleted.',
    )
  })

  it('normalizes non-owner backend errors', () => {
    const error = new ApiError('You can only delete your own activities', 403)
    expect(getDeleteActivityErrorMessage(error)).toBe('You can only delete activities that you host.')
  })
})
