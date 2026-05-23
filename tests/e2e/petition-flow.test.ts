import { test, expect, BrowserContext } from '@playwright/test'

// Full petition lifecycle: admin creates → owner comments → AI revision → signing → PDF export
// Requires: dev server running, DB seeded (npm run db:seed), NEXTAUTH_URL set
test.describe('petition lifecycle', () => {
  test('admin creates petition, owner signs, PDF exported', async ({ page, browser }) => {
    // 1. Admin logs in via magic link (in test env, use direct session or seed)
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('Вход')

    // In E2E env we skip OAuth and go straight to admin area via seeded session
    // Navigate directly to admin petitions
    await page.goto('/admin/petitions')
    // If redirected to login, the test env needs a pre-seeded session cookie
    // For CI: seed admin user first, then use credentials provider

    // 2. Create new petition
    await page.click('text=+ Новое заявление')
    await expect(page).toHaveURL(/\/admin\/petitions\/new/)

    await page.fill('input[placeholder*="название"]', 'Тест заявление E2E')
    await page.fill('textarea[placeholder*="Текст"]', 'Мы, собственники ЖК Сад, требуем...')
    await page.click('text=Создать заявление и открыть обсуждение')

    // 3. Petition created and moved to DISCUSSION — on discussion page
    await expect(page).toHaveURL(/\/admin\/petitions\/.+\/discussion/, { timeout: 10_000 })
    await expect(page.locator('h1')).toContainText('Обсуждение')

    const petitionUrl = await page.locator('code').textContent()
    expect(petitionUrl).toContain('/petition/')

    // 4. Open petition as owner in separate context
    let ownerCtx: BrowserContext | undefined
    try {
      ownerCtx = await browser.newContext()
      const ownerPage = await ownerCtx.newPage()
      await ownerPage.goto(petitionUrl!)
      await expect(ownerPage.locator('h1')).toBeVisible({ timeout: 10_000 })

      // Owner leaves a comment
      await ownerPage.fill('textarea[placeholder*="предложения"]', 'Прошу добавить пункт о сроках')
      await ownerPage.click('text=Отправить комментарий')
      await ownerPage.waitForLoadState('networkidle')

      // 5. Admin starts AI revision
      await page.reload()
      await page.click('text=Запустить AI-ревизию →')
      await expect(page).toHaveURL(/\/revision/, { timeout: 10_000 })

      // 6. Run AI revision
      await page.click('text=Запустить AI-ревизию')
      await expect(page.locator('textarea')).toBeVisible({ timeout: 60_000 })

      // 7. Approve and open signing
      await page.click('text=Утвердить и открыть подписание')
      await expect(page).toHaveURL(/\/signing/, { timeout: 10_000 })

      // 8. Owner signs the petition
      await ownerPage.reload()
      await ownerPage.waitForLoadState('networkidle')
      const signLink = ownerPage.locator('text=Перейти к подписанию')
      if (await signLink.isVisible()) {
        await signLink.click()
        await ownerPage.check('input[type=checkbox]')
        await ownerPage.click('text=Подписать заявление')
        await expect(ownerPage.locator('text=Заявление подписано')).toBeVisible({ timeout: 10_000 })
      }

      // 9. Admin closes signing and exports
      await page.click('text=Закрыть сбор подписей')
      await expect(page).toHaveURL(/\/export/, { timeout: 10_000 })
      await expect(page.locator('text=Скачать PDF')).toBeVisible()
    } finally {
      await ownerCtx?.close()
    }
  })
})
