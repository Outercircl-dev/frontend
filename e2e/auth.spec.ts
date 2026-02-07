import { test, expect } from '@playwright/test'
import { selectors } from './fixtures/selectors'

test('login page toggles between sign in and join', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByPlaceholder(selectors.placeholders.authEmail)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send sign-in link' })).toBeVisible()

  await page.getByRole('button', { name: 'Join' }).click()

  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
})
