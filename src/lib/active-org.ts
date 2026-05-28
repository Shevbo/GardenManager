import { cookies } from 'next/headers'
import prisma from './prisma'

const COOKIE_NAME = 'garden_active_org'

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

  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { orgId: true },
    take: 2,
  })
  if (memberships.length === 1) return memberships[0].orgId
  return null
}

export async function getUserOrgIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { orgId: true },
  })
  return memberships.map(m => m.orgId)
}
