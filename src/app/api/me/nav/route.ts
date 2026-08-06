import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrgId } from '@/lib/active-org'

// The left-nav switcher lists the CONTEXTS the user belongs to — their
// organizations (one per org, not per apartment), the groups their orgs are in,
// and the activities they joined.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [memberships, typeRefs, activeOrgId] = await Promise.all([
    prisma.membership.findMany({ where: { userId }, select: { org: { select: { id: true, name: true, type: true } } } }),
    prisma.orgTypeRef.findMany({ select: { code: true, label: true } }),
    getActiveOrgId(userId),
  ])
  const typeLabel = new Map(typeRefs.map(t => [t.code, t.label]))

  const orgMap = new Map<string, { orgId: string; name: string; typeLabel: string }>()
  for (const m of memberships) {
    if (!orgMap.has(m.org.id)) {
      orgMap.set(m.org.id, { orgId: m.org.id, name: m.org.name, typeLabel: typeLabel.get(m.org.type) ?? m.org.type })
    }
  }
  const orgs = [...orgMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const orgIds = [...orgMap.keys()]

  const [groupRows, actRows] = await Promise.all([
    orgIds.length
      ? prisma.orgGroup.findMany({ where: { orgs: { some: { organizationId: { in: orgIds } } } }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
    prisma.activityMembership.findMany({ where: { userId }, select: { activity: { select: { id: true, name: true } } } }),
  ])

  return NextResponse.json({
    activeOrgId,
    orgs,
    groups: groupRows.map(g => ({ id: g.id, name: g.name })),
    activities: actRows.map(a => ({ id: a.activity.id, name: a.activity.name })),
  })
}
