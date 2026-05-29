import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  process.env.UNISENDER_API_TOKEN = 'test-key'
  process.env.EMAIL_FROM = 'test@example.com'
  vi.stubEnv('NODE_ENV', 'production')
  vi.resetModules()
})

afterEach(() => {
  delete process.env.UNISENDER_API_TOKEN
  delete process.env.EMAIL_FROM
  vi.unstubAllGlobals()
})

describe('sendEmailOtp', () => {
  it('sends email with OTP code in subject via UniSender Go', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({ status: 'success', job_id: 'j1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { sendEmailOtp } = await import('@/lib/email')
    await sendEmailOtp('user@example.com', '123456')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-KEY': 'test-key',
          'Content-Type': 'application/json',
        }),
      })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.message.recipients[0].email).toBe('user@example.com')
    expect(body.message.subject).toContain('123456')
    expect(body.message.from_email).toBe('test@example.com')
  })
})
