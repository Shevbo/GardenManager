import { describe, it, expect, vi, beforeEach } from 'vitest'

// Мок Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'test-id' }),
      },
    }
  }),
}))

// Мок env
beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'test@example.com'
  vi.resetModules()
})

describe('sendEmailOtp', () => {
  it('sends email with OTP code in subject', async () => {
    const { Resend } = await import('resend')
    const mockSend = vi.fn().mockResolvedValue({ id: 'test-id' })
    ;(Resend as ReturnType<typeof vi.fn>).mockImplementation(function () {
      return { emails: { send: mockSend } }
    })

    const { sendEmailOtp } = await import('@/lib/email')
    await sendEmailOtp('user@example.com', '123456')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('123456'),
      })
    )
  })
})
