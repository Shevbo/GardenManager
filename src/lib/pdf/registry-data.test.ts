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
  it('author (canSeePii) sees all names + addresses', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'admin', canSeePii: true })
    expect(rows.map(r => r.name)).toEqual(['Иванов', 'Петров'])
    expect(rows[0].address).toBe('ул. Садовая, д. 1')
  })
  it('SMS-confirmed ownership shows «Собственник» + address', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов')], { viewerUserId: 'admin', canSeePii: true })
    expect(rows[0].type).toBe('Собственник')
    expect(rows[0].address).toBe('ул. Садовая, д. 1')
  })
  it('non-author sees ALL names (ФИО), but others’ addresses are masked', () => {
    const rows = buildRegistryRows([sig('u1', 'Иванов'), sig('u2', 'Петров')], { viewerUserId: 'u1', canSeePii: false })
    expect(rows[0].name).toBe('Иванов')
    expect(rows[1].name).toBe('Петров')       // ФИО always visible
    expect(rows[0].address).toBe('ул. Садовая, д. 1') // own address visible
    expect(rows[1].address).toBe(MASK)         // other's address masked
  })
  it('signer with no shown objects still appears once with «—»', () => {
    const noProp = { ...sig('u3', 'Сидоров'), user: { name: 'Сидоров', email: null, phone: '+7901', properties: [] } }
    const rows = buildRegistryRows([noProp], { viewerUserId: 'admin', canSeePii: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ num: 1, type: '—', address: '—' })
  })
})
