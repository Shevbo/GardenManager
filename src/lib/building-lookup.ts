import prisma from './prisma'
import { normalizeAddress, splitAddress, pickBuilding } from './address-match'

export type BuildingLookup = {
  /** Нормализованный ключ введённого адреса (пишем его же в PendingRegistration). */
  normalized: string
  building: {
    id: string
    address: string
    orgId: string | null
    /** typeLabel — из справочника OrgTypeRef; в интерфейсе НЕ хардкодим «ЖК». */
    org: { id: string; name: string; typeLabel: string | null } | null
  } | null
  /** Заполняется, когда дом определить однозначно нельзя (несколько корпусов). */
  candidates: Array<{ id: string; address: string }>
}

/**
 * Единая точка поиска дома по свободно введённому адресу — ею обязаны
 * пользоваться ВСЕ шаги регистрации, иначе шаг 1 говорит «нашли», а submit
 * заводит заявку в ожидание (так и было: три разных нормализации в трёх местах).
 */
export async function findBuildingForAddress(raw: string): Promise<BuildingLookup> {
  const normalized = normalizeAddress(raw)
  if (!normalized) return { normalized, building: null, candidates: [] }

  const { base } = splitAddress(normalized)
  const rows = await prisma.building.findMany({
    where: { addressNormalized: { startsWith: base } },
    select: {
      id: true, address: true, addressNormalized: true, orgId: true,
      org: { select: { id: true, name: true, type: true, deletedAt: true } },
    },
  })
  // дом удалённой организации не должен «находиться»
  const alive = rows.filter(b => !b.org?.deletedAt)

  const { match, candidates } = pickBuilding(normalized, alive)
  if (!match) {
    return { normalized, building: null, candidates: candidates.map(c => ({ id: c.id, address: c.address })) }
  }

  let org: { id: string; name: string; typeLabel: string | null } | null = null
  if (match.org) {
    const ref = await prisma.orgTypeRef.findFirst({ where: { code: match.org.type }, select: { label: true } })
    org = { id: match.org.id, name: match.org.name, typeLabel: ref?.label ?? null }
  }

  return {
    normalized,
    building: { id: match.id, address: match.address, orgId: match.orgId, org },
    candidates: [],
  }
}
