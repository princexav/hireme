import { test, expect } from '@playwright/test'

const EMAIL    = 'int.okeke@gmail.com'
const PASSWORD = 'HireMe2024!'

test('tailor resume: full flow + changes persist on cache hit', async ({ page }) => {
  test.setTimeout(180000)

  // ── Login ──────────────────────────────────────────────────────────────
  await page.goto('/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(search|queue|onboarding)/, { timeout: 15000 })

  // ── Navigate to Queue ──────────────────────────────────────────────────
  await page.goto('/queue')
  await page.screenshot({ path: 'e2e/screenshots/tailor-01-queue.png', fullPage: true })

  // Make sure at least one queued job card is visible
  const tailorCardBtn = page.getByRole('button', { name: /tailor resume/i }).first()
  await expect(tailorCardBtn).toBeVisible({ timeout: 10000 })

  // ── Open the tailor sheet ──────────────────────────────────────────────
  await tailorCardBtn.click()
  await expect(page.getByText(/tailored resume/i)).toBeVisible({ timeout: 5000 })
  await page.screenshot({ path: 'e2e/screenshots/tailor-02-sheet-open.png', fullPage: true })

  // useEffect auto-loads cached resume or auto-starts tailoring — no manual click needed.
  // Wait for AI response (or instant auto-load from cache)
  await expect(page.getByText('Original', { exact: true }).first()).toBeVisible({ timeout: 90000 })
  await page.screenshot({ path: 'e2e/screenshots/tailor-03-result.png', fullPage: true })

  // ── Assert ATS score panel ─────────────────────────────────────────────
  await expect(page.getByText('Tailored', { exact: true })).toBeVisible()
  // Score delta — "+N pts" label
  await expect(page.locator('text=/\\+\\d+ pts/')).toBeVisible()

  // ── Assert keyword badges ──────────────────────────────────────────────
  await expect(page.getByText('ATS keywords targeted')).toBeVisible()
  const badges = page.locator('.bg-\\[\\#eef2ff\\]')
  await expect(badges.first()).toBeVisible()
  const badgeCount = await badges.count()
  expect(badgeCount).toBeGreaterThan(0)
  console.log(`✓ ${badgeCount} ATS keyword badges visible`)

  // ── Assert "What changed" section ─────────────────────────────────────
  await expect(page.getByText('What changed:')).toBeVisible()
  const changeItems = page.locator('li').filter({ hasText: '→' })
  const changeCount = await changeItems.count()
  expect(changeCount).toBeGreaterThan(0)
  console.log(`✓ ${changeCount} change bullets visible`)

  // ── Assert editable textarea has content ──────────────────────────────
  const textarea = page.locator('textarea')
  await expect(textarea).toBeVisible()
  const resumeText = await textarea.inputValue()
  expect(resumeText.length).toBeGreaterThan(100)
  console.log(`✓ Tailored resume text: ${resumeText.length} chars`)

  // ── Assert PDF download button present ────────────────────────────────
  await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible()

  // ── Close and reopen — verify useEffect auto-loads cached resume ────────
  await page.getByRole('button', { name: /done/i }).click()
  await expect(page.getByText(/tailored resume/i)).not.toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /tailor resume/i }).first().click()
  await expect(page.getByText(/tailored resume/i)).toBeVisible({ timeout: 5000 })

  // useEffect fires on mount — cached resume auto-loads from DB without clicking the tailor button
  await expect(page.getByText('What changed:')).toBeVisible({ timeout: 15000 })
  const cachedChangeCount = await page.locator('li').filter({ hasText: '→' }).count()
  expect(cachedChangeCount).toBeGreaterThan(0)
  console.log(`✓ Changes auto-loaded on reopen: ${cachedChangeCount} bullets`)

  await page.screenshot({ path: 'e2e/screenshots/tailor-04-cache-hit.png', fullPage: true })
  console.log('✅ Tailor resume test passed')
})
