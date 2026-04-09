import { test, expect } from '@playwright/test'

test.describe('Auth pages', () => {
  test('login page shows HireMe wordmark', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('HireMe')).toBeVisible()
    await expect(page.getByText('AI-powered job search, built for you')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: 'Sign up free' })).toBeVisible()
  })

  test('signup page shows HireMe wordmark', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText('HireMe').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  })

  test('signup page has password min length hint', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText('min 8 chars')).toBeVisible()
  })

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('unauthenticated / redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated /search redirects to login', async ({ page }) => {
    await page.goto('/search')
    await expect(page).toHaveURL(/\/login/)
  })

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'wrong@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 10000 })
  })
})
