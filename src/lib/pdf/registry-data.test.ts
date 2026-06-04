import { describe, it, expect } from 'vitest'
import { buildRegistryRows } from './registry-data'
import { MASK } from '../pii'

const sig = (userId: string, name: string) => ({
  id: 's-' + userId, petitionId: 'p', userId, verifiedVia: 'sms', legalConsent: true,
  signedAt: new Date('2026-01-02T10:00:00Z'),
  user: { name, email: null, phone: '+7900' },
  membership: { apartment: { number: '12' }, org: { name: 'ЖК Сад' } },
})

describe('buildRegistryRows', () => {
  it('admin sees all names', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'admin', isAdmin: true })
    expect(rows.map(r => r.name)).toEqual(['Иванов', 'Петров'])
  })
  it('participant sees own name, others masked', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'u1', isAdmin: false })
    expect(rows[0].name).toBe('Иванов')
    expect(rows[1].name).toBe(MASK)
    expect(rows[1].apartment).toBe(MASK)
  })
  it('numbers rows from 1', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов')], { viewerUserId: 'admin', isAdmin: true })
    expect(rows[0].num).toBe(1)
  })
})
