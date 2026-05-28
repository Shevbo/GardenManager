import { describe, it, expect } from 'vitest'
import { normalizeAddress } from './address-match'

describe('normalizeAddress', () => {
  it('lowercases and trims', () => {
    expect(normalizeAddress('  Москва, ул. Садовая, д. 12  ')).toBe('москва ул садовая д 12')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeAddress('Москва,  ул.   Садовая')).toBe('москва ул садовая')
  })

  it('strips punctuation', () => {
    expect(normalizeAddress('Москва, ул. Садовая, д. 12')).toBe('москва ул садовая д 12')
  })

  it('expands ул to улица then re-shortens consistently', () => {
    expect(normalizeAddress('Москва, улица Садовая, дом 12')).toBe('москва ул садовая д 12')
    expect(normalizeAddress('Москва, ул. Садовая, д. 12')).toBe('москва ул садовая д 12')
  })

  it('drops apartment portion', () => {
    expect(normalizeAddress('Москва, ул. Садовая, д. 12, кв. 47')).toBe('москва ул садовая д 12')
    expect(normalizeAddress('Москва, ул. Садовая, д. 12, квартира 47')).toBe('москва ул садовая д 12')
  })

  it('preserves building/structure', () => {
    expect(normalizeAddress('Москва, ул. Садовая, д. 12, корп. 2')).toBe('москва ул садовая д 12 корп 2')
    expect(normalizeAddress('Москва, ул. Садовая, д. 12, стр. 1')).toBe('москва ул садовая д 12 стр 1')
  })

  it('handles single-quoted and double-quoted areas', () => {
    expect(normalizeAddress('Москва, проспект «Мира», 100')).toBe('москва пр-кт мира 100')
  })

  it('handles empty / whitespace input', () => {
    expect(normalizeAddress('')).toBe('')
    expect(normalizeAddress('   ')).toBe('')
  })
})
