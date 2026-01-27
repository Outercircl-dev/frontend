/**
 * Unit tests for feedback endpoints consumed by useActivityFeedback.
 */

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useActivityFeedback API surface', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('requests the feedback form endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        activityId: 'activity-1',
        eligible: true,
        activityEnded: true,
        submitted: false,
        participants: [],
      }),
    })

    const response = await fetch('/rpc/v1/activities/activity-1/feedback')
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith('/rpc/v1/activities/activity-1/feedback')
    expect(data.activityId).toBe('activity-1')
    expect(data.eligible).toBe(true)
  })

  it('submits feedback via POST', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rating: 5,
        comment: 'Great activity',
        consentToAnalysis: true,
        participantRatings: [],
      }),
    })

    const response = await fetch('/rpc/v1/activities/activity-1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: 5,
        comment: 'Great activity',
        consentToAnalysis: true,
        participantRatings: [],
      }),
    })
    const data = await response.json()

    expect(mockFetch).toHaveBeenCalledWith('/rpc/v1/activities/activity-1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: 5,
        comment: 'Great activity',
        consentToAnalysis: true,
        participantRatings: [],
      }),
    })
    expect(data.rating).toBe(5)
  })
})

