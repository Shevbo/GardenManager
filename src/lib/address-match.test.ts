import { describe, it, expect } from 'vitest'
import { normalizeAddress, splitAddress, pickBuilding } from './address-match'

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

  // Боевой случай: дом заведён админом как «зд 10 к 1» (формат DaData),
  // а житель вводит «д. 10» — до фикса это были два разных ключа.
  it('drops the settlement marker «г»', () => {
    expect(normalizeAddress('г Севастополь, ул Летчиков, д 10')).toBe('севастополь ул летчиков д 10')
    expect(normalizeAddress('город Москва, ул. Садовая, д. 12')).toBe('москва ул садовая д 12')
  })

  it('treats зд/здание as дом and к as корпус', () => {
    expect(normalizeAddress('г Севастополь, ул Летчиков, зд 10 к 1'))
      .toBe('севастополь ул летчиков д 10 корп 1')
    expect(normalizeAddress('Севастополь, ул Летчиков, здание 10, корпус 1'))
      .toBe('севастополь ул летчиков д 10 корп 1')
  })
})

describe('splitAddress', () => {
  it('splits the корпус/строение tail off the house address', () => {
    expect(splitAddress('севастополь ул летчиков д 10 корп 1'))
      .toEqual({ base: 'севастополь ул летчиков д 10', block: 'корп 1' })
    expect(splitAddress('москва ул садовая д 12 стр 1'))
      .toEqual({ base: 'москва ул садовая д 12', block: 'стр 1' })
  })

  it('leaves an address without корпус intact', () => {
    expect(splitAddress('москва ул садовая д 12'))
      .toEqual({ base: 'москва ул садовая д 12', block: null })
  })
})

describe('pickBuilding', () => {
  const k1 = { id: 'b1', addressNormalized: 'севастополь ул летчиков д 10 корп 1' }
  const k2 = { id: 'b2', addressNormalized: 'севастополь ул летчиков д 10 корп 2' }

  it('matches exactly when the address is identical', () => {
    expect(pickBuilding('севастополь ул летчиков д 10 корп 1', [k1, k2]).match).toBe(k1)
  })

  it('matches the single корпус when the resident typed the house without one', () => {
    expect(pickBuilding('севастополь ул летчиков д 10', [k1]).match).toBe(k1)
  })

  it('does not guess when several корпуса share the house — returns candidates', () => {
    const r = pickBuilding('севастополь ул летчиков д 10', [k1, k2])
    expect(r.match).toBeNull()
    expect(r.candidates).toEqual([k1, k2])
  })

  it('respects an explicitly typed корпус', () => {
    expect(pickBuilding('севастополь ул летчиков д 10 корп 2', [k1, k2]).match).toBe(k2)
  })

  it('returns nothing for an unknown street', () => {
    const r = pickBuilding('москва ул садовая д 1', [k1, k2])
    expect(r.match).toBeNull()
    expect(r.candidates).toEqual([])
  })

  it('ignores buildings without a normalized address', () => {
    const r = pickBuilding('севастополь ул летчиков д 10', [{ id: 'b3', addressNormalized: null }])
    expect(r.match).toBeNull()
  })
})
