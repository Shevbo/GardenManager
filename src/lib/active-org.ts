import { cookies } from 'next/headers'
import prisma from './prisma'

const COOKIE_NAME = 'garden_active_org'

/**
 * The user's active group. The cookie wins (if the user is still a member);
 * otherwise defaults to their first group. Never returns null when the user has
 * at least one membership — every screen must be scoped to a concrete group so
 * content of other groups never leaks (isolation).
 */
export async function getActiveOrgId(userId: string): Promise<string | null> {
  const store = await cookies()
  const fromCookie = store.get(COOKIE_NAME)?.value

  if (fromCookie) {
    const m = await prisma.membership.findFirst({
      where: { userId, orgId: fromCookie },
      select: { orgId: true },
    })
    if (m) return m.orgId
  }

  const first = await prisma.membership.findFirst({
    where: { userId },
    select: { orgId: true },
    orderBy: { orgId: 'asc' },
  })
  return first?.orgId ?? null
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
