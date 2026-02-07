import { test, expect } from '@playwright/test'
import { setupMockApi } from './fixtures/mock-api'
import { buildActivity, withViewerStatus } from './fixtures/mock-data'
import { selectors } from './fixtures/selectors'

test('participant can join and cancel an activity', async ({ page }) => {
  const baseActivity = buildActivity()
  await setupMockApi(page, {
    activity: withViewerStatus(baseActivity, 'not_joined'),
    joinActivity: withViewerStatus(baseActivity, 'confirmed'),
    cancelActivity: withViewerStatus(baseActivity, 'not_joined'),
  })

  await page.goto('/activities/activity-1')

  await expect(page.getByText('You have not joined this activity yet.')).toBeVisible()

  await page.getByRole('button', { name: selectors.buttons.joinActivity }).click()
  await expect(page.getByText('You are confirmed for this activity.')).toBeVisible()

  await page.getByRole('button', { name: selectors.buttons.cancelParticipation }).click()
  await expect(page.getByText('You have not joined this activity yet.')).toBeVisible()
})
