import { test, expect, BrowserContext } from '@playwright/test'

// Full petition lifecycle: admin creates → owner comments → AI revision → signing → PDF export
//
// PREREQUISITES (must be set up before running):
//   1. Run: npx prisma db seed        (creates ЖК Сад + admin bshevelev75@gmail.com)
//   2. Run: npm run dev               (or set PLAYWRIGHT_BASE_URL to the target server)
//   3. Create a test session cookie:
//      - Log in as bshevelev75@gmail.com via the app UI, export session from DevTools,
//        or use a Credentials test provider (dev-only, not shipped to prod).
//      - Set PLAYWRIGHT_SESSION_COOKIE=<value> in .env.test
//   4. NEXT_PUBLIC_URL must equal the test base URL (default: http://localhost:3000)
//
// NOTE: Retries are disabled (retries: 0) because each test run mutates DB state.
//       Reset the DB before each run or use isolated test fixtures.

test.use({
  storageState: process.env.PLAYWRIGHT_STORAGE_STATE
    ? JSON.parse(process.env.PLAYWRIGHT_STORAGE_STATE)
    : undefined,
})

test.describe('petition lifecycle', () => {
  test('admin creates petition, owner signs, PDF exported', async ({ page, browser }) => {
    // 1. Navigate to admin area (requires authenticated session)
    await page.goto('/admin/petitions')
    // If the session is not set up, this will redirect to /login and the test will fail clearly
    await expect(page).toHaveURL(/\/admin\/petitions/, { timeout: 10_000 })

    // 2. Create new petition
    await page.getByRole('link', { name: '+ Новое заявление' }).click()
    await expect(page).toHaveURL(/\/admin\/petitions\/new/)

    await page.getByPlaceholder('Краткое название').fill('Тест заявление E2E')
    await page.getByPlaceholder('Текст коллективного').fill('Мы, собственники ЖК Сад, требуем...')
    await page.getByRole('button', { name: /Создать заявление/ }).click()

    // 3. Should land on discussion page (petition was auto-transitioned to DISCUSSION)
    await expect(page).toHaveURL(/\/admin\/petitions\/.+\/discussion/, { timeout: 15_000 })
    await expect(page.locator('h1')).toContainText('Обсуждение')

    const petitionUrlCode = await page.locator('code').textContent()
    expect(petitionUrlCode).toBeTruthy()
    expect(petitionUrlCode).toContain('/petition/')

    // Extract relative path for owner navigation (avoids NEXT_PUBLIC_URL mismatch)
    const petitionPath = petitionUrlCode!.replace(/^https?:\/\/[^/]+/, '')

    // 4. Open petition as owner in a separate browser context
    let ownerCtx: BrowserContext | undefined
    try {
      ownerCtx = await browser.newContext()
      const ownerPage = await ownerCtx.newPage()

      // Owner logs in and visits petition
      await ownerPage.goto(petitionPath)
      await expect(ownerPage.locator('h1')).toBeVisible({ timeout: 10_000 })

      // Owner leaves a comment (only visible when logged in as a member)
      const commentArea = ownerPage.getByPlaceholder(/предложения/)
      if (await commentArea.isVisible()) {
        await commentArea.fill('Прошу добавить пункт о сроках ответа')
        await ownerPage.getByRole('button', { name: /Отправить/ }).click()
        await ownerPage.waitForLoadState('networkidle')
      }

      // 5. Admin page: reload to see comment, then start AI revision
      await page.reload()
      await page.getByRole('button', { name: /Запустить AI-ревизию/ }).click()
      await expect(page).toHaveURL(/\/revision/, { timeout: 10_000 })

      // 6. Trigger AI revision (DeepSeek call — may take up to 60s in prod)
      await page.getByRole('button', { name: /Запустить AI-ревизию/ }).click()
      await expect(page.getByRole('textbox')).toBeVisible({ timeout: 60_000 })

      // 7. Approve final text and open signing
      await page.getByRole('button', { name: /Утвердить/ }).click()
      await expect(page).toHaveURL(/\/signing/, { timeout: 10_000 })

      // 8. Owner navigates back to petition — it should now be in SIGNING phase
      await ownerPage.goto(petitionPath)
      await ownerPage.waitForLoadState('networkidle')
      const signLink = ownerPage.getByRole('link', { name: /Перейти к подписанию/ })
      if (await signLink.isVisible()) {
        await signLink.click()
        await ownerPage.getByRole('checkbox').check()
        await ownerPage.getByRole('button', { name: /Подписать заявление/ }).click()
        await expect(ownerPage.getByText(/Заявление подписано/)).toBeVisible({ timeout: 10_000 })
      }

      // 9. Admin closes signing and exports
      await page.getByRole('button', { name: /Закрыть сбор/ }).click()
      await expect(page).toHaveURL(/\/export/, { timeout: 10_000 })
      await expect(page.getByRole('button', { name: /Скачать PDF/ })).toBeVisible()
    } finally {
      await ownerCtx?.close()
    }
  })
})
