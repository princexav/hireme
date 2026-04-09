import { test, expect } from '@playwright/test'

// These tests require a logged-in user. We test the public-facing redirects
// and UI elements that don't need auth.

test.describe('Dashboard layout (unauthenticated redirects)', () => {
  test('/queue redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/queue')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/tracker redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/tracker')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/onboarding redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Login page UI', () => {
  test('login page renders a card with shadow and rounded corners', async ({ page }) => {
    await page.goto('/login')
    // The card should have a white background with border
    const card = page.locator('.rounded-2xl')
    await expect(card).toBeVisible()
  })

  test('login page background is light slate', async ({ page }) => {
    await page.goto('/login')
    const body = page.locator('body')
    const bg = await body.evaluate(el => getComputedStyle(el).backgroundColor)
    // #f8fafc = rgb(248, 250, 252)
    expect(bg).toBe('rgb(248, 250, 252)')
  })
})
