import type { RegistryRow, ViewerContext } from './types'
import { maskPii } from '../pii'

export interface SignatureInput {
  id: string
  petitionId: string
  userId: string
  verifiedVia: string
  legalConsent: boolean
  signedAt: Date
  user: { name?: string | null; email?: string | null; phone?: string | null }
  membership?: { apartment?: { number: string } | null; org?: { name: string } | null } | null
}

export function buildRegistryRows(signatures: SignatureInput[], viewer: ViewerContext): RegistryRow[] {
  return signatures.map((s, i) => {
    const owner = s.userId
    const rawName = s.user.name ?? s.user.email ?? s.user.phone ?? 'Аноним'
    return {
      num: i + 1,
      name: maskPii(rawName, { ownerUserId: owner, viewer }),
      apartment: maskPii(s.membership?.apartment?.number ?? '—', { ownerUserId: owner, viewer }),
      org: s.membership?.org?.name ?? '—',
      signedAt: s.signedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      verifiedVia: s.verifiedVia === 'sms' ? 'SMS' : s.verifiedVia === 'email' ? 'Email' : s.verifiedVia.toUpperCase(),
    }
  })
}
