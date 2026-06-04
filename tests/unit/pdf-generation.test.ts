import { describe, it, expect } from 'vitest'
import { buildRegistryRows } from '@/lib/pdf'

describe('pdf registry rows', () => {
  it('formats signature row correctly', () => {
    const rows = buildRegistryRows([
      {
        id: 's1',
        petitionId: 'p1',
        userId: 'u1',
        verifiedVia: 'sms',
        legalConsent: true,
        signedAt: new Date('2026-05-23T10:00:00Z'),
        user: { name: 'Иван Петров', email: 'ivan@test.ru', phone: '+79991234567' },
        membership: { apartment: { number: '42' }, org: { name: 'ЖК Сад' } },
      },
    ], { viewerUserId: null, isAdmin: true })
    expect(rows[0]).toMatchObject({
      num: 1,
      name: 'Иван Петров',
      apartment: '42',
      org: 'ЖК Сад',
      verifiedVia: 'SMS',
    })
  })
})
