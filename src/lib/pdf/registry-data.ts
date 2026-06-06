import type { RegistryRow, ViewerContext } from './types'
import { maskPii } from '../pii'

export interface SignatureProperty {
  address: string
  apartmentNumber?: string | null
  signedAt?: Date | null   // ownership confirmed via SMS
}

export interface SignatureInput {
  id: string
  petitionId: string
  userId: string
  verifiedVia: string
  legalConsent: boolean
  signedAt: Date
  user: {
    name?: string | null
    email?: string | null
    phone?: string | null
    properties?: SignatureProperty[]   // ones the user chose to show in the registry
  }
}

// Registry shows the address only down to the building — apartment number is disclosed on request.
function fmtAddress(p: SignatureProperty): string {
  return p.address
}

/**
 * Builds registry rows. For each signer we emit one row per property object the signer
 * marked «показывать в реестре». «Тип» = «Собственник» when that object's ownership was
 * confirmed via SMS (signedAt set), else «—». A signer with no shown objects still appears
 * once with «—».
 */
export function buildRegistryRows(signatures: SignatureInput[], viewer: ViewerContext): RegistryRow[] {
  const rows: RegistryRow[] = []
  let num = 0
  for (const s of signatures) {
    const owner = s.userId
    const rawName = s.user.name ?? s.user.email ?? s.user.phone ?? 'Аноним'
    const name = maskPii(rawName, { ownerUserId: owner, viewer })
    const signedAt = s.signedAt.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    const props = s.user.properties ?? []
    if (props.length === 0) {
      rows.push({ num: ++num, name, type: '—', address: '—', signedAt })
      continue
    }
    // Address is shown to the building only → collapse objects that render identically
    // (same building + same ownership status); distinct buildings stay separate rows.
    const seen = new Set<string>()
    for (const p of props) {
      const type = p.signedAt ? 'Собственник' : '—'
      const addr = fmtAddress(p)
      const key = `${addr}|${type}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ num: ++num, name, type, address: maskPii(addr, { ownerUserId: owner, viewer }), signedAt })
    }
  }
  return rows
}
