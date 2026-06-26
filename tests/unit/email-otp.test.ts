import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// email.ts sends via nodemailer SMTP transport — mock it so no real SMTP is hit.
const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-msg-id' })
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}))

beforeEach(() => {
  sendMailMock.mockClear()
  process.env.SMTP_PASSWORD = 'test-pass'
  process.env.EMAIL_FROM = 'test@example.com'
  vi.stubEnv('NODE_ENV', 'production')
  vi.resetModules()
})

afterEach(() => {
  delete process.env.SMTP_PASSWORD
  delete process.env.EMAIL_FROM
  vi.unstubAllEnvs()
})

describe('sendEmailOtp', () => {
  it('sends OTP email with the code in the subject via SMTP transport', async () => {
    const { sendEmailOtp } = await import('@/lib/email')
    await sendEmailOtp('user@example.com', '123456')

    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const arg = sendMailMock.mock.calls[0][0]
    expect(arg.to).toBe('user@example.com')
    expect(arg.subject).toContain('123456')
    expect(String(arg.from)).toContain('test@example.com')
  })
})
