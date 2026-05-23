import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateOtp } from '@/lib/sms'

describe('OTP generation', () => {
  it('generates 6-digit numeric string', () => {
    const otp = generateOtp()
    expect(otp).toMatch(/^\d{6}$/)
  })

  it('generates different OTPs each call', () => {
    const otps = new Set(Array.from({ length: 10 }, generateOtp))
    expect(otps.size).toBeGreaterThan(1)
  })
})

describe('phone validation', () => {
  it('accepts valid Russian phone', () => {
    expect(/^\+7\d{10}$/.test('+79991234567')).toBe(true)
  })

  it('rejects invalid phone', () => {
    expect(/^\+7\d{10}$/.test('89991234567')).toBe(false)
    expect(/^\+7\d{10}$/.test('+7999123456')).toBe(false)
  })
})
