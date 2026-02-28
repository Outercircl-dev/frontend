import { test, expect } from '@playwright/test'
import { setupMockApi } from './fixtures/mock-api'
import { selectors } from './fixtures/selectors'

test('feed loads and filters activities', async ({ page }) => {
  await setupMockApi(page)
  await page.goto('/feed')

  await expect(page.getByRole('heading', { name: selectors.headings.feed })).toBeVisible()
  await expect(page.getByText('Sunrise Run')).toBeVisible()

  const searchInput = page.getByPlaceholder(selectors.placeholders.feedSearch)
  await searchInput.fill('Coffee')

  await expect(page.getByText('Coffee Walk')).toBeVisible()
  await expect(page.getByText('Sunrise Run')).toHaveCount(0)

  await searchInput.fill('zzzz')
  await expect(page.getByText('No activities found')).toBeVisible()
})
