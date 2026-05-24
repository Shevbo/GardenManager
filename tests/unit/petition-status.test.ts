import { describe, it, expect } from 'vitest'
import { canTransition, canGoBack, PetitionStatus } from '@/lib/petition-status'

describe('petition status machine', () => {
  it('allows DRAFT → DISCUSSION', () => {
    expect(canTransition('DRAFT', 'DISCUSSION')).toBe(true)
  })
  it('blocks DRAFT → SIGNING', () => {
    expect(canTransition('DRAFT', 'SIGNING')).toBe(false)
  })
  it('allows DISCUSSION → AI_REVISION', () => {
    expect(canTransition('DISCUSSION', 'AI_REVISION')).toBe(true)
  })
  it('allows AI_REVISION → SIGNING', () => {
    expect(canTransition('AI_REVISION', 'SIGNING')).toBe(true)
  })
  it('allows SIGNING → CLOSED', () => {
    expect(canTransition('SIGNING', 'CLOSED')).toBe(true)
  })
  it('allows CLOSED → EXPORTED', () => {
    expect(canTransition('CLOSED', 'EXPORTED')).toBe(true)
  })
  it('blocks any backward transition', () => {
    expect(canTransition('SIGNING', 'DRAFT')).toBe(false)
  })
  it('blocks EXPORTED → anything', () => {
    expect(canTransition('EXPORTED', 'CLOSED')).toBe(false)
  })
  it('blocks same-status transition', () => {
    expect(canTransition('DRAFT', 'DRAFT')).toBe(false)
  })
})

describe('canGoBack', () => {
  it('DISCUSSION can go back to DRAFT', () => {
    expect(canGoBack('DISCUSSION')).toBe('DRAFT')
  })
  it('AI_REVISION can go back to DISCUSSION', () => {
    expect(canGoBack('AI_REVISION')).toBe('DISCUSSION')
  })
  it('SIGNING can go back to AI_REVISION', () => {
    expect(canGoBack('SIGNING')).toBe('AI_REVISION')
  })
  it('DRAFT has no back', () => {
    expect(canGoBack('DRAFT')).toBeNull()
  })
  it('CLOSED has no back (signatures locked)', () => {
    expect(canGoBack('CLOSED')).toBeNull()
  })
  it('EXPORTED has no back', () => {
    expect(canGoBack('EXPORTED')).toBeNull()
  })
})
