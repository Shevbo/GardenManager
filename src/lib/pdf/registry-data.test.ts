import { describe, it, expect } from 'vitest'
import { buildRegistryRows } from './registry-data'
import { MASK } from '../pii'

const sig = (userId: string, name: string) => ({
  id: 's-' + userId, petitionId: 'p', userId, verifiedVia: 'sms', legalConsent: true,
  signedAt: new Date('2026-01-02T10:00:00Z'),
  user: {
    name, email: null, phone: '+7900',
    properties: [{ address: 'ул. Садовая, д. 1', apartmentNumber: '12', signedAt: new Date('2026-01-01T00:00:00Z') }],
  },
})

describe('buildRegistryRows', () => {
  it('admin sees all names', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'admin', isAdmin: true })
    expect(rows.map(r => r.name)).toEqual(['Иванов', 'Петров'])
  })
  it('SMS-confirmed ownership shows «Собственник» + address', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов')], { viewerUserId: 'admin', isAdmin: true })
    expect(rows[0].type).toBe('Собственник')
    expect(rows[0].address).toBe('ул. Садовая, д. 1')
  })
  it('participant sees own name, others masked (incl. address)', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'u1', isAdmin: false })
    expect(rows[0].name).toBe('Иванов')
    expect(rows[1].name).toBe(MASK)
    expect(rows[1].address).toBe(MASK)
  })
  it('signer with no shown objects still appears once with «—»', () => {
    const noProp = { ...sig('u3', 'Сидоров'), user: { name: 'Сидоров', email: null, phone: '+7901', properties: [] } }
    const rows = buildRegistryRows([noProp], { viewerUserId: 'admin', isAdmin: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ num: 1, type: '—', address: '—' })
  })
})
