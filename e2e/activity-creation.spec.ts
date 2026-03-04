import { expect, test } from '@playwright/test'

async function mockAuthenticatedUser(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
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

async function fillRequiredActivityFields(page: import('@playwright/test').Page, address: string) {
  await page.getByPlaceholder('Title').fill('Morning Run')
  await page.getByPlaceholder('Category').fill('Sports')
  await page.getByRole('button', { name: /Running/i }).click()
  await page.getByPlaceholder('Address').fill(address)
  await page.getByPlaceholder('Latitude').fill('37.7749')
  await page.getByPlaceholder('Longitude').fill('-122.4194')
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
  await fillRequiredActivityFields(page, '123456')

  await expect(page.getByText('Enter a valid location address using standard address characters.')).toBeVisible()
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
    const payload = route.request().postDataJSON() as { timezone?: string }
    expect(payload.timezone).toBeTruthy()

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
