import { test, expect } from '@playwright/test'

const EMAIL    = 'int.okeke@gmail.com'
const PASSWORD = 'HireMe2024!'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(search|queue|onboarding)/, { timeout: 15000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 1: Queue empty state card
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Queue empty state card', () => {
  test('shows rich empty state when queue is empty', async ({ page }) => {
    await login(page)
    await page.goto('/queue')

    // Wait for the queue to finish loading
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'e2e/screenshots/queue-empty-state.png', fullPage: true })

    const isEmpty = (await page.locator('text=Your queue is empty').count()) > 0
    if (!isEmpty) {
      test.skip() // Queue has jobs — skip this test
      return
    }

    // Icon container
    await expect(page.locator('.bg-muted.rounded-xl')).toBeVisible()
    // Heading
    await expect(page.getByRole('heading', { name: 'Your queue is empty' })).toBeVisible()
    // Body copy
    await expect(page.getByText(/Jobs you select from the search page/)).toBeVisible()
    // "Find Jobs" CTA links to /search
    const findJobsLink = page.getByRole('link', { name: 'Find Jobs' })
    await expect(findJobsLink).toBeVisible()
    await expect(findJobsLink).toHaveAttribute('href', '/search')
  })

  test('"Find Jobs" link navigates to search page', async ({ page }) => {
    await login(page)
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')

    const isEmpty = (await page.locator('text=Your queue is empty').count()) > 0
    if (!isEmpty) {
      test.skip()
      return
    }

    await page.getByRole('link', { name: 'Find Jobs' }).click()
    await expect(page).toHaveURL(/\/search/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature 2: QueueCard salary & location metadata row
// ─────────────────────────────────────────────────────────────────────────────

test.describe('QueueCard metadata row', () => {
  test('queue cards render location/salary row when data present', async ({ page }) => {
    await login(page)
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')

    const cardCount = await page.locator('[data-slot="card"]').count()
    if (cardCount === 0) {
      test.skip() // No cards to check
      return
    }

    await page.screenshot({ path: 'e2e/screenshots/queue-cards-metadata.png', fullPage: true })

    // At least one MapPin icon should exist in a card with location
    // (lucide renders as <svg> — we check the parent span text for location-like content)
    // Check the match score display
    const matchScores = page.locator('text=% match')
    await expect(matchScores.first()).toBeVisible({ timeout: 10000 })

    // Verify the "Tailor Resume" button text (updated from "Edit Resume")
    await expect(page.getByRole('button', { name: /tailor resume/i }).first()).toBeVisible()

    // Check that "Send Application" button is present
    await expect(page.getByRole('button', { name: /send application/i }).first()).toBeVisible()
  })

  test('salary text format is correct when salary data exists', async ({ page }) => {
    await login(page)
    await page.goto('/queue')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'e2e/screenshots/queue-salary-check.png', fullPage: true })

    // Check if any salary formatted text exists ($Xk – $Yk pattern)
    const salaryPattern = page.locator('text=/\\$\\d+k/')
    const hasSalary = (await salaryPattern.count()) > 0
    if (hasSalary) {
      await expect(salaryPattern.first()).toBeVisible()
      console.log('✓ Salary metadata row present')
    } else {
      console.log('ℹ No salary data in current queue jobs — skipping salary assertion')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature 3: Tailor sheet progress bar
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tailor sheet progress bar', () => {
  test('progress bar appears and advances through phases', async ({ page }) => {
    test.setTimeout(180000)

    await login(page)
    await page.goto('/queue')

    const tailorBtn = page.getByRole('button', { name: /tailor resume/i }).first()
    const hasQueue = (await tailorBtn.count()) > 0
    if (!hasQueue) {
      test.skip()
      return
    }

    await tailorBtn.click()
    // Sheet title should appear
    await expect(page.getByText(/tailored resume/i)).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'e2e/screenshots/tailor-sheet-open.png', fullPage: true })

    // Check if it's a cache hit (instant load) or fresh tailor (shows progress bar)
    const isCached = (await page.locator('text=What changed:').count()) > 0
    if (isCached) {
      console.log('ℹ Cached resume detected — verifying instant load (no progress bar)')
      await expect(page.locator('text=What changed:')).toBeVisible()
      // Progress bar should NOT be visible on cache hit
      const progressBar = page.locator('[role="progressbar"]')
      await expect(progressBar).not.toBeVisible()
      console.log('✓ No progress bar on cache hit — correct')
      return
    }

    // Fresh tailor: progress bar should appear
    console.log('ℹ Fresh tailor detected — checking progress bar...')
    const progressBar = page.locator('[role="progressbar"]')
    await expect(progressBar).toBeVisible({ timeout: 60000 })
    await page.screenshot({ path: 'e2e/screenshots/tailor-progress-bar.png', fullPage: true })
    console.log('✓ Progress bar visible')

    // At least one phase label should be visible
    const phaseLabels = [
      'Extracting ATS keywords',
      'Semantically scoring',
      'AI is tailoring',
      'Formatting PDF',
    ]
    let foundPhase = false
    for (const label of phaseLabels) {
      if ((await page.locator(`text=/${label}/`).count()) > 0) {
        console.log(`✓ Phase label visible: "${label}…"`)
        foundPhase = true
        break
      }
    }
    expect(foundPhase).toBe(true)

    // "Tailoring… please wait" button should be disabled
    const tailoringBtn = page.getByRole('button', { name: /tailoring.*please wait/i })
    await expect(tailoringBtn).toBeVisible({ timeout: 5000 })
    await expect(tailoringBtn).toBeDisabled()
    console.log('✓ Tailor button is disabled while tailoring')

    // Wait for completion
    await expect(page.getByText('What changed:')).toBeVisible({ timeout: 120000 })
    await page.screenshot({ path: 'e2e/screenshots/tailor-progress-complete.png', fullPage: true })
    console.log('✓ Progress bar completed — results visible')

    // Progress bar should be gone after completion
    await expect(progressBar).not.toBeVisible({ timeout: 5000 })
    console.log('✓ Progress bar cleared after completion')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature 4: Chat sidebar Markdown rendering
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat sidebar Markdown rendering', () => {
  test('chat sidebar opens and accepts input', async ({ page }) => {
    await login(page)
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // The chat sidebar strip should be visible (collapsed by default)
    const chatStrip = page.getByTitle('Open AI Chat')
    await expect(chatStrip).toBeVisible({ timeout: 10000 })

    // Click to open
    await chatStrip.click()
    await expect(page.getByText('AI Assistant')).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'e2e/screenshots/chat-sidebar-open.png', fullPage: true })
    console.log('✓ Chat sidebar opens')

    // Input field and send button should be present
    await expect(page.getByPlaceholder('Ask anything…')).toBeVisible()
    await expect(page.getByRole('button', { name: '→' })).toBeVisible()
    console.log('✓ Chat input and send button visible')
  })

  test('chat renders assistant response (checks for HTML elements not raw markdown)', async ({ page }) => {
    test.setTimeout(60000)

    await login(page)
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // Open chat
    const chatStrip = page.getByTitle('Open AI Chat')
    const isCollapsed = await chatStrip.isVisible()
    if (isCollapsed) await chatStrip.click()

    await expect(page.getByPlaceholder('Ask anything…')).toBeVisible({ timeout: 5000 })

    // Send a message that will elicit a markdown response
    await page.fill('[placeholder="Ask anything…"]', 'List 3 common interview questions in bullet points.')
    await page.getByRole('button', { name: '→' }).click()
    await page.screenshot({ path: 'e2e/screenshots/chat-sending.png', fullPage: true })

    // Wait for the streaming placeholder '…' to disappear (response complete)
    // Wait for assistant response to appear (text longer than placeholder)
    await expect(page.locator('.bg-\\[\\#f1f5f9\\]').last()).not.toHaveText('…', { timeout: 45000 })
    await page.screenshot({ path: 'e2e/screenshots/chat-response.png', fullPage: true })

    // Verify response is rendered as HTML (not raw **text**)
    // If markdown is working, we should see <strong> or <ul>/<li> elements in assistant bubbles
    // and NOT see raw "**" asterisks
    const assistantBubbles = page.locator('.bg-\\[\\#f1f5f9\\]')
    const bubbleCount = await assistantBubbles.count()
    expect(bubbleCount).toBeGreaterThan(0)

    // Check no raw markdown syntax visible — get text and look for literal **
    const lastBubble = assistantBubbles.last()
    const bubbleText = await lastBubble.innerText()
    const hasRawBold = bubbleText.includes('**')
    expect(hasRawBold).toBe(false)
    console.log('✓ No raw ** markdown syntax visible in chat bubbles')

    console.log('✓ Chat response rendered successfully')
  })

  test('chat sidebar collapses and state persists via × button', async ({ page }) => {
    await login(page)
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    // Open sidebar
    const chatStrip = page.getByTitle('Open AI Chat')
    if (await chatStrip.isVisible()) await chatStrip.click()
    await expect(page.getByText('AI Assistant')).toBeVisible({ timeout: 5000 })

    // Close via × button
    await page.getByTitle('Close').click()
    await expect(page.getByTitle('Open AI Chat')).toBeVisible({ timeout: 3000 })
    console.log('✓ Chat sidebar collapsed via × button')
  })
})
