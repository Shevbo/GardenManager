import { describe, it, expect } from 'vitest'
import { maskPii, MASK } from './pii'

describe('maskPii', () => {
  it('admin sees the real value', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'admin', isAdmin: true } })).toBe('Иванов И.И.')
  })
  it('owner sees their own value', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'u2', isAdmin: false } })).toBe('Иванов И.И.')
  })
  it('other participant sees the mask', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'u3', isAdmin: false } })).toBe(MASK)
  })
  it('anonymous viewer sees the mask', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: null, isAdmin: false } })).toBe(MASK)
  })
  it('empty value stays empty (no mask on blanks)', () => {
    expect(maskPii('', { ownerUserId: 'u2', viewer: { viewerUserId: 'u3', isAdmin: false } })).toBe('')
  })
})
