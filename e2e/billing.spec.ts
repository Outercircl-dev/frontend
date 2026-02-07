import { test, expect } from '@playwright/test'
import { setupMockApi } from './fixtures/mock-api'
import { selectors } from './fixtures/selectors'

test('user can start upgrade flow and reach success page', async ({ page }) => {
  await setupMockApi(page, {
    billing: { checkoutUrl: '/pricing/success', statusTier: 'premium' },
  })

  await page.goto('/pricing')
  await expect(page.getByRole('heading', { name: selectors.headings.pricing })).toBeVisible()

  await page.getByRole('button', { name: selectors.buttons.upgradePremium }).click()
  await page.waitForURL('**/pricing/success')

  await expect(page.getByText('Thanks for upgrading!')).toBeVisible()
  await expect(page.getByText('Your Premium access is active.')).toBeVisible()
})
