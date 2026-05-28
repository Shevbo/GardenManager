import { test, expect } from '@playwright/test'

test.describe('public smoke tests', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Garden Manager/)
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('register page renders wizard step 1', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByText('Адрес дома')).toBeVisible()
  })

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.db.ok).toBe(true)
  })

  test('protected route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('address check endpoint responds for known address', async ({ request }) => {
    const res = await request.post('/api/register/check-address', {
      data: { rawAddress: 'Москва, ул. Тестовая, д. 1' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('matched')
    expect(body).toHaveProperty('normalized')
  })
})
