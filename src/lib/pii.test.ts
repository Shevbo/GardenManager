import { describe, it, expect } from 'vitest'
import { maskPii, maskSenderLine, MASK } from './pii'

describe('maskPii', () => {
  it('author (canSeePii) sees the real value', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'admin', canSeePii: true } })).toBe('Иванов И.И.')
  })
  it('owner sees their own value', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'u2', canSeePii: false } })).toBe('Иванов И.И.')
  })
  it('other participant sees the mask', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: 'u3', canSeePii: false } })).toBe(MASK)
  })
  it('anonymous viewer sees the mask', () => {
    expect(maskPii('Иванов И.И.', { ownerUserId: 'u2', viewer: { viewerUserId: null, canSeePii: false } })).toBe(MASK)
  })
  it('empty value stays empty (no mask on blanks)', () => {
    expect(maskPii('', { ownerUserId: 'u2', viewer: { viewerUserId: 'u3', canSeePii: false } })).toBe('')
  })
})

describe('maskSenderLine', () => {
  const full = 'от Шевелева Бориса Сергеевича,\nдействующего в качестве представителя\nот имени группы заявителей,\nпроживающего по адресу:\n299000, г. Севастополь, ул. Летчиков, зд. 10, кв. 104,\nтел.: +7 985 923 23 44,\ne-mail: b@mail.ru'

  it('author sees the full sender line', () => {
    expect(maskSenderLine(full, true)).toBe(full)
  })
  it('non-author keeps the name + role but not the address/phone/email', () => {
    const masked = maskSenderLine(full, false)!
    expect(masked).toContain('Шевелева Бориса Сергеевича')
    expect(masked).toContain('представителя')
    expect(masked).not.toMatch(/Летчиков|Севастополь|104|923|mail\.ru/)
    expect(masked).not.toMatch(/\d/) // no digits (address/phone) leak
  })
  it('null passes through', () => {
    expect(maskSenderLine(null, false)).toBeNull()
  })
  it('a sender line without a contact block is left intact', () => {
    expect(maskSenderLine('Собственники ЖК «Гарден»', false)).toBe('Собственники ЖК «Гарден»')
  })
})
