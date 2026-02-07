import { test, expect } from '@playwright/test'
import { setupMockApi } from './fixtures/mock-api'
import { baseAuthState, baseAuthUser, buildActivity } from './fixtures/mock-data'
import { selectors } from './fixtures/selectors'

const hostAuthState = {
  ...baseAuthState,
  user: {
    ...baseAuthUser,
    supabaseUserId: 'host-1',
    role: 'authenticated',
    tierRules: {
      ...baseAuthUser.tierRules,
      groups: { enabled: false, maxMembers: 12 },
      verification: { requiresVerifiedHostForHosting: false },
    },
  },
}

test('host can create an activity', async ({ page }) => {
  await setupMockApi(page, {
    authState: hostAuthState,
    activity: buildActivity({ hostId: 'host-1' }),
  })

  await page.goto('/activities/new')
  await expect(page.getByRole('heading', { name: selectors.headings.createActivity })).toBeVisible()

  await page.getByPlaceholder('Title').fill('Community Jog')
  await page.getByPlaceholder('Category').fill('fitness')
  await page.getByRole('button', { name: /Running/ }).click()

  await page.getByPlaceholder('Address').fill('City Park')
  await page.getByPlaceholder('Latitude').fill('53.34')
  await page.getByPlaceholder('Longitude').fill('-6.27')

  const dateInput = page.locator('input[type="date"]')
  await dateInput.fill('2026-03-14')
  const timeInputs = page.locator('input[type="time"]')
  await timeInputs.nth(0).fill('09:00')
  await timeInputs.nth(1).fill('10:00')

  await page.locator('input[type="number"]').first().fill('10')

  const createButton = page.getByRole('button', { name: selectors.buttons.createActivity })
  await expect(createButton).toBeEnabled()
  await createButton.click()

  await page.waitForURL('**/activities/activity-new')
  await expect(page.getByText(selectors.headings.activityDetail)).toBeVisible()
})

test('host can approve a participant request', async ({ page }) => {
  await setupMockApi(page, {
    authState: hostAuthState,
  })

  await page.goto('/host/activities/activity-1/participants')
  await expect(page.getByRole('heading', { name: selectors.headings.roster })).toBeVisible()

  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('confirmed')).toBeVisible()
})
