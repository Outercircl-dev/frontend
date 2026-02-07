import { test, expect } from '@playwright/test'
import { setupMockApi } from './fixtures/mock-api'
import { baseAuthState, baseAuthUser, buildActivity, buildMessage, buildMessagesResponse } from './fixtures/mock-data'
import { selectors } from './fixtures/selectors'

const hostAuthState = {
  ...baseAuthState,
  user: {
    ...baseAuthUser,
    supabaseUserId: 'host-1',
    role: 'authenticated',
  },
}

test('host can send and pin a group message', async ({ page }) => {
  await setupMockApi(page, {
    authState: hostAuthState,
    activity: buildActivity({ hostId: 'host-1' }),
    messages: buildMessagesResponse([buildMessage()]),
  })

  await page.goto('/activities/activity-1')
  await expect(page.getByText('Group messages')).toBeVisible()

  await page.getByPlaceholder(selectors.placeholders.groupMessage).fill('Hello team!')
  await page.getByRole('button', { name: selectors.buttons.sendMessage }).click()

  await expect(page.getByText('Hello team!')).toBeVisible()

  await page.getByRole('button', { name: 'Pin' }).click()
  await expect(page.getByText('Pinned announcement')).toBeVisible()
})
