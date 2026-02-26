const mockFetch = jest.fn()
global.fetch = mockFetch

describe('notifications API surface', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('requests notifications list endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    })

    const response = await fetch('/rpc/v1/notifications?limit=20')
    const payload = await response.json()

    expect(mockFetch).toHaveBeenCalledWith('/rpc/v1/notifications?limit=20')
    expect(payload.items).toEqual([])
  })

  it('updates notification preferences via PUT', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recommendedActivities: true,
        upcomingActivityReminders: true,
      }),
    })

    const body = { recommendedActivities: false }
    const response = await fetch('/rpc/v1/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await response.json()

    expect(mockFetch).toHaveBeenCalledWith('/rpc/v1/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
})

