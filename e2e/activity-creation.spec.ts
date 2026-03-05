import { expect, test } from '@playwright/test'

async function mockAuthenticatedUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    class MockAutocomplete {
      private input: HTMLInputElement
      private listener: (() => void) | null = null

      constructor(input: HTMLInputElement) {
        this.input = input
      }

      addListener(eventName: string, callback: () => void) {
        if (eventName === 'place_changed') {
          this.listener = callback
        }
        return {
          remove: () => {
            this.listener = null
          },
        }
      }

      getPlace() {
        const query = this.input.value
        return {
          formatted_address: query,
          place_id: 'mock_place_123',
          geometry: {
            location: {
              lat: () => 37.7749,
              lng: () => -122.4194,
            },
          },
        }
      }

      triggerSelection() {
        this.listener?.()
      }
    }

    class MockMap {
      addListener() {
        return { remove: () => undefined }
      }

      setCenter() {}

      setZoom() {}
    }

    class MockMarker {
      setPosition() {}
    }

    class MockGeocoder {
      geocode(
        request: { location?: { lat: number; lng: number } },
        callback: (results: Array<{ formatted_address: string; place_id: string }>, status: string) => void,
      ) {
        const lat = request.location?.lat ?? 37.7749
        const lng = request.location?.lng ?? -122.4194
        callback(
          [
            {
              formatted_address: `Selected map point ${lat}, ${lng}`,
              place_id: 'mock_place_from_map',
            },
          ],
          'OK',
        )
      }
    }

    const googleMock = {
      maps: {
        Map: MockMap,
        Marker: MockMarker,
        Geocoder: MockGeocoder,
        places: {
          Autocomplete: class {
            private instance: MockAutocomplete

            constructor(input: HTMLInputElement) {
              this.instance = new MockAutocomplete(input)
              input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                  this.instance.triggerSelection()
                }
              })
            }

            addListener(eventName: string, callback: () => void) {
              return this.instance.addListener(eventName, callback)
            }

            getPlace() {
              return this.instance.getPlace()
            }
          },
        },
      },
    }
    ;(window as unknown as { google: unknown }).google = googleMock

    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/rpc/v1/auth/me')) {
        return new Response(
          JSON.stringify({
            state: 'active',
            redirectUrl: '/activities',
            user: {
              id: 'user-1',
              email: 'host@example.com',
              supabaseUserId: 'host-123',
              role: 'authenticated',
              type: 'FREEMIUM',
              tierRules: {
                hosting: {
                  maxParticipantsPerActivity: 4,
                  maxHostsPerMonth: 2,
                  enforceExactMaxParticipants: true,
                },
                groups: {
                  enabled: false,
                  maxMembers: 15,
                },
                ads: {
                  showsAds: true,
                },
                verification: {
                  requiresVerifiedHostForHosting: true,
                },
                messaging: {
                  groupChatEnabled: true,
                  automatedMessagesEnabled: true,
                },
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (url.includes('/rpc/v1/activities/groups')) {
        return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/rpc/v1/notifications')) {
        return new Response(JSON.stringify({ items: [], unreadCount: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return originalFetch(input, init)
    }
  })
}

async function fillRequiredActivityFields(
  page: import('@playwright/test').Page,
  address: string,
  options?: { selectLocation?: boolean },
) {
  const selectLocation = options?.selectLocation ?? true
  await page.getByPlaceholder('Title').fill('Morning Run')
  await page.getByPlaceholder('Category').fill('Sports')
  await page.getByRole('button', { name: /Running/i }).click()
  const locationInput = page.getByPlaceholder('Search address or place')
  await locationInput.fill(address)
  if (selectLocation) {
    await locationInput.press('Enter')
  }
  await page.locator('input[type="date"]').first().fill('2099-12-31')
  const timeInputs = page.locator('input[type="time"]')
  await timeInputs.nth(0).fill('10:00')
  await timeInputs.nth(1).fill('11:00')
}

test('prevents submit for invalid location and shows validation error', async ({ page }) => {
  await mockAuthenticatedUser(page)

  let createEndpointCalled = false
  await page.route('**/rpc/v1/activities', async (route) => {
    if (route.request().method() === 'POST') {
      createEndpointCalled = true
    }
    await route.continue()
  })

  await page.goto('/e2e/activity-create')
  await expect(page.getByText('Create a new activity')).toBeVisible()
  await fillRequiredActivityFields(page, '123456', { selectLocation: false })

  await expect(page.getByText('Select a location from Google suggestions.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create activity' })).toBeDisabled()
  expect(createEndpointCalled).toBe(false)
})

test('submits valid future payload and redirects to activity details', async ({ page }) => {
  await mockAuthenticatedUser(page)
  let createEndpointCalled = false

  await page.route('**/rpc/v1/activities', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    createEndpointCalled = true
    const payload = route.request().postDataJSON() as { timezone?: string; location?: { placeId?: string } }
    expect(payload.timezone).toBeTruthy()
    expect(payload.location?.placeId).toBe('mock_place_123')

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'activity-123' }),
    })
  })

  await page.goto('/e2e/activity-create')
  await expect(page.getByText('Create a new activity')).toBeVisible()
  await fillRequiredActivityFields(page, '221B Baker Street')

  await expect(page.getByRole('button', { name: 'Create activity' })).toBeEnabled()
  await page.getByRole('button', { name: 'Create activity' }).click()
  expect(createEndpointCalled).toBe(true)
  await page.waitForURL(/\/(activities\/activity-123|login)/)
})
