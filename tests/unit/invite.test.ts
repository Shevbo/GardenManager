import { describe, it, expect } from 'vitest'
import { validateInvite } from '@/lib/invite'

describe('validateInvite', () => {
  it('returns valid for a fresh invite', () => {
    const result = validateInvite({
      usedBy: null,
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    expect(result.valid).toBe(true)
  })

  it('returns not_found for null', () => {
    const result = validateInvite(null)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('not_found')
  })

  it('returns used when already accepted', () => {
    const result = validateInvite({
      usedBy: 'user-abc',
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('used')
  })

  it('returns expired for past expiry', () => {
    const result = validateInvite({
      usedBy: null,
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe('expired')
  })

  it('returns valid when expiresAt is null (no expiry)', () => {
    const result = validateInvite({ usedBy: null, expiresAt: null })
    expect(result.valid).toBe(true)
  })
})
