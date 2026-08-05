import { cookies } from 'next/headers'
import prisma from './prisma'

const COOKIE_NAME = 'garden_active_membership'
/** Legacy cookie held an orgId; honoured as a group hint during rollover. */
const LEGACY_COOKIE_NAME = 'garden_active_org'

const ACTIVE_INCLUDE = { org: true, apartment: true } as const

/**
 * The user's active MEMBERSHIP (a specific apartment in a specific group).
 *
 * A user may own several apartments in the SAME group (one membership each), so
 * the active scope must be a membership — keying it on orgId alone collapses two
 * apartments of one group into the same view and makes the left-nav switcher a
 * no-op. The cookie wins (if the membership still belongs to the user); otherwise
 * we fall back deterministically to the user's first membership. Never returns
 * null when the user has at least one membership — every screen must be scoped to
 * a concrete group so other groups' content never leaks (isolation).
 */
export async function getActiveMembership(userId: string) {
  const store = await cookies()

  const cookieId = store.get(COOKIE_NAME)?.value
  if (cookieId) {
    const m = await prisma.membership.findFirst({
      where: { id: cookieId, userId },
      include: ACTIVE_INCLUDE,
    })
    if (m) return m
  }

  const legacyOrgId = store.get(LEGACY_COOKIE_NAME)?.value
  if (legacyOrgId) {
    const m = await prisma.membership.findFirst({
      where: { userId, orgId: legacyOrgId },
      orderBy: { id: 'asc' },
      include: ACTIVE_INCLUDE,
    })
    if (m) return m
  }

  return prisma.membership.findFirst({
    where: { userId },
    orderBy: { id: 'asc' },
    include: ACTIVE_INCLUDE,
  })
}

/**
 * The org of the user's active membership. Kept for all org-scoped screens
 * (assemblies, petitions) which do not care which apartment is active.
 */
export async function getActiveOrgId(userId: string): Promise<string | null> {
  return (await getActiveMembership(userId))?.orgId ?? null
}

export async function getUserOrgIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { orgId: true },
  })
  return [...new Set(memberships.map(m => m.orgId))]
}

/** Distinct groups the user belongs to (for the home group tabs / switcher). */
export async function getUserOrgs(userId: string): Promise<Array<{ id: string; name: string }>> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { org: { select: { id: true, name: true } } },
  })
  const byId = new Map<string, { id: string; name: string }>()
  for (const m of memberships) byId.set(m.org.id, m.org)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}
