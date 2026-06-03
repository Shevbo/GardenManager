import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function getAdminOrgId(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, role: { in: ['org_admin', 'platform_admin'] } },
    select: { orgId: true },
  })
  return membership?.orgId ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await prisma.membership.findMany({
    where: { orgId },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, phone: true, phoneVerified: true,
          _count: { select: { activityMemberships: true } }
        }
      },
      apartment: {
        select: {
          id: true, number: true, floor: true, entrance: true, areaSqm: true,
          building: { select: { id: true, address: true } },
        },
      },
      org: {
        select: {
          id: true, name: true, type: true,
          orgGroups: { select: { orgGroup: { select: { id: true, name: true } } } },
        },
      },
      ownershipDeclarations: { orderBy: { signedAt: 'desc' }, take: 1, select: { signedAt: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return NextResponse.json({
    members: members.map(m => ({
      id: m.id,
      role: m.role,
      isOwner: m.isOwner,
      areaSqm: m.areaSqm,
      verifiedAt: m.verifiedAt?.toISOString() ?? null,
      user: {
        id: m.user.id, name: m.user.name, email: m.user.email,
        phone: m.user.phone, phoneVerified: !!m.user.phoneVerified
      },
      apartment: m.apartment ? {
        id: m.apartment.id, number: m.apartment.number,
        floor: m.apartment.floor, entrance: m.apartment.entrance, areaSqm: m.apartment.areaSqm,
        building: m.apartment.building,
      } : null,
      org: {
        id: m.org.id, name: m.org.name,
        orgGroups: m.org.orgGroups.map(og => ({ id: og.orgGroup.id, name: og.orgGroup.name })),
      },
      activitiesCount: m.user._count.activityMemberships,
      lastDeclarationAt: m.ownershipDeclarations[0]?.signedAt.toISOString() ?? null,
      blockReason: (!m.isOwner ? null : !m.apartment ? 'no_apartment' : m.ownershipDeclarations.length === 0 ? 'no_declaration' : null) as 'no_apartment' | 'no_declaration' | null,
    })),
  })
}
