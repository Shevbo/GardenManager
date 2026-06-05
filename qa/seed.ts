/** Idempotent QA seed: 2 orgs, buildings/apartments, 20 users with roles. Namespaced `qa-`. */
import type { PrismaClient } from '@prisma/client'

export type Role = 'platform_admin' | 'coalition_admin' | 'org_admin' | 'council_member' | 'owner' | 'tenant'
export interface QaUser { id: string; email: string; name: string; role: Role; orgId: string; orgSlug: string; apartmentId: string | null; areaSqm: number | null; phoneVerified: boolean; declared: boolean }
export interface QaData {
  orgA: string; orgB: string; orgGroupId: string
  buildings: { id: string; orgSlug: string }[]
  apartments: { id: string; buildingId: string; number: string }[]
  users: QaUser[]
}

// 20 users: roles + flags. org: 'a' or 'b'. apt index within that org's apartments (or null).
const PLAN: { role: Role; org: 'a' | 'b'; apt: number | null; verified: boolean; declared: boolean }[] = [
  { role: 'platform_admin', org: 'a', apt: null, verified: true, declared: false },
  { role: 'platform_admin', org: 'a', apt: null, verified: true, declared: false },
  { role: 'org_admin', org: 'a', apt: 0, verified: true, declared: true },
  { role: 'council_member', org: 'a', apt: 1, verified: true, declared: true },
  { role: 'org_admin', org: 'b', apt: 0, verified: true, declared: true },
  { role: 'council_member', org: 'b', apt: 1, verified: true, declared: false },
  { role: 'coalition_admin', org: 'a', apt: null, verified: true, declared: false },
  { role: 'coalition_admin', org: 'b', apt: null, verified: true, declared: false },
  { role: 'owner', org: 'a', apt: 2, verified: true, declared: true },
  { role: 'owner', org: 'a', apt: 3, verified: true, declared: true },
  { role: 'owner', org: 'a', apt: 4, verified: true, declared: false },
  { role: 'owner', org: 'a', apt: 5, verified: false, declared: false },
  { role: 'owner', org: 'a', apt: null, verified: true, declared: false }, // owner without apartment (block: no_apartment)
  { role: 'owner', org: 'b', apt: 2, verified: true, declared: true },
  { role: 'owner', org: 'b', apt: 3, verified: true, declared: true },
  { role: 'owner', org: 'b', apt: 4, verified: true, declared: false },
  { role: 'owner', org: 'b', apt: 5, verified: true, declared: false },
  { role: 'owner', org: 'b', apt: null, verified: true, declared: false },
  { role: 'tenant', org: 'a', apt: null, verified: true, declared: false },
  { role: 'tenant', org: 'b', apt: null, verified: false, declared: false },
]

export async function seedQa(prisma: PrismaClient): Promise<QaData> {
  const orgA = await prisma.organization.upsert({ where: { slug: 'qa-org-a' }, update: {}, create: { slug: 'qa-org-a', name: 'QA ЖК Альфа', type: 'zhk' } })
  const orgB = await prisma.organization.upsert({ where: { slug: 'qa-org-b' }, update: {}, create: { slug: 'qa-org-b', name: 'QA ЖК Бета', type: 'zhk' } })

  const buildings: { id: string; orgSlug: string }[] = []
  const apartments: { id: string; buildingId: string; number: string }[] = []
  for (const [slug, org] of [['qa-org-a', orgA], ['qa-org-b', orgB]] as const) {
    for (let b = 0; b < 2; b++) {
      const addr = `QA ${org.name}, корпус ${b + 1}`
      const building = await prisma.building.upsert({ where: { addressNormalized: addr }, update: {}, create: { orgId: org.id, address: addr, addressNormalized: addr } })
      buildings.push({ id: building.id, orgSlug: slug })
      for (let a = 0; a < 3; a++) {
        const number = `${b + 1}0${a + 1}`
        const apt = await prisma.apartment.upsert({ where: { buildingId_number: { buildingId: building.id, number } }, update: {}, create: { buildingId: building.id, number, floor: a + 1, areaSqm: 40 + a * 10 } })
        apartments.push({ id: apt.id, buildingId: building.id, number })
      }
    }
  }
  const aptByOrg = { a: apartments.filter(x => buildings.find(b => b.id === x.buildingId)?.orgSlug === 'qa-org-a'), b: apartments.filter(x => buildings.find(b => b.id === x.buildingId)?.orgSlug === 'qa-org-b') }

  const users: QaUser[] = []
  for (let i = 0; i < PLAN.length; i++) {
    const p = PLAN[i]
    const n = String(i + 1).padStart(2, '0')
    const email = `qa-user-${n}@test.local`
    const org = p.org === 'a' ? orgA : orgB
    const aptId = p.apt !== null ? (aptByOrg[p.org][p.apt]?.id ?? null) : null
    const areaSqm = aptId ? 40 + (p.apt! % 3) * 10 : null
    const phone = `+7999000${n}${n}`
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `QA User ${n}`, phone, phoneVerified: p.verified ? new Date() : null, emailVerified: new Date(), status: 'ACTIVE', address: `QA адрес ${n}, кв. ${p.apt ?? '-'}` },
      create: { email, name: `QA User ${n}`, phone, phoneVerified: p.verified ? new Date() : null, emailVerified: new Date(), status: 'ACTIVE', address: `QA адрес ${n}, кв. ${p.apt ?? '-'}` },
    })
    // Membership (unique userId+orgId)
    const mem = await prisma.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId: org.id } },
      update: { role: p.role, apartmentId: aptId, isOwner: p.role === 'owner', areaSqm },
      create: { userId: user.id, orgId: org.id, role: p.role, apartmentId: aptId, isOwner: p.role === 'owner', areaSqm, verifiedAt: new Date() },
    })
    if (p.declared) {
      const has = await prisma.ownershipDeclaration.findFirst({ where: { membershipId: mem.id } })
      if (!has) await prisma.ownershipDeclaration.create({ data: { userId: user.id, membershipId: mem.id, areaSqm, declaredText: 'QA декларация собственности', smsToken: 'qa-seed' } })
    }
    users.push({ id: user.id, email, name: `QA User ${n}`, role: p.role, orgId: org.id, orgSlug: p.org === 'a' ? 'qa-org-a' : 'qa-org-b', apartmentId: aptId, areaSqm, phoneVerified: p.verified, declared: p.declared })
  }

  // Org group linking both (createdBy = first user)
  let grp = await prisma.orgGroup.findFirst({ where: { name: 'QA Коалиция' } })
  if (!grp) {
    grp = await prisma.orgGroup.create({ data: { name: 'QA Коалиция', createdBy: users[0].id } })
    for (const o of [orgA.id, orgB.id]) {
      const exists = await prisma.orgGroupMembership.findFirst({ where: { orgGroupId: grp.id, organizationId: o } })
      if (!exists) await prisma.orgGroupMembership.create({ data: { orgGroupId: grp.id, organizationId: o } })
    }
  }

  return { orgA: orgA.id, orgB: orgB.id, orgGroupId: grp.id, buildings, apartments, users }
}
