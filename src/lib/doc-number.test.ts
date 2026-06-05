import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './doc-number'

describe('formatDocNumber', () => {
  it('pads sequence to 3 digits', () => { expect(formatDocNumber(2026, 1)).toBe('2026-001') })
  it('keeps larger sequences', () => { expect(formatDocNumber(2026, 137)).toBe('2026-137') })
  it('returns null when missing', () => {
    expect(formatDocNumber(null, 1)).toBeNull()
    expect(formatDocNumber(2026, null)).toBeNull()
    expect(formatDocNumber(undefined, undefined)).toBeNull()
  })
})
