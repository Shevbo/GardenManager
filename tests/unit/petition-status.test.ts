import { describe, it, expect } from 'vitest'
import { canTransition, PetitionStatus } from '@/lib/petition-status'

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
