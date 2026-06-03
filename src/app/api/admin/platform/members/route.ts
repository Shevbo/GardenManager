import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const memberships = await prisma.membership.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, phoneVerified: true, _count: { select: { activityMemberships: true } } } },
      apartment: {
        select: {
          id: true, number: true, floor: true, entrance: true, areaSqm: true,
          building: { select: { id: true, address: true } },
        },
      },
      org: {
        select: {
          id: true, name: true, type: true, slug: true,
          orgGroups: { include: { orgGroup: { select: { id: true, name: true } } } },
        },
      },
      ownershipDeclarations: { orderBy: { signedAt: 'desc' }, take: 1, select: { signedAt: true } },
    },
    orderBy: [{ org: { name: 'asc' } }, { user: { name: 'asc' } }],
  })

  const result = memberships.map(m => ({
    id: m.id,
    role: m.role,
    isOwner: m.isOwner,
    areaSqm: m.areaSqm,
    verifiedAt: m.verifiedAt?.toISOString() ?? null,
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      phoneVerified: !!m.user.phoneVerified,
    },
    apartment: m.apartment
      ? {
          id: m.apartment.id,
          number: m.apartment.number,
          floor: m.apartment.floor,
          entrance: m.apartment.entrance,
          areaSqm: m.apartment.areaSqm,
          building: m.apartment.building,
        }
      : null,
    org: {
      id: m.org.id,
      name: m.org.name,
      type: m.org.type,
      slug: m.org.slug,
      orgGroups: m.org.orgGroups.map(og => ({ id: og.orgGroup.id, name: og.orgGroup.name })),
    },
    activitiesCount: m.user._count.activityMemberships,
    lastDeclarationAt: m.ownershipDeclarations[0]?.signedAt.toISOString() ?? null,
    blockReason: computeBlockReason(m),
  }))

  return NextResponse.json({ members: result })
}

function computeBlockReason(m: {
  isOwner: boolean
  apartment: unknown | null
  ownershipDeclarations: Array<unknown>
}): 'no_apartment' | 'no_declaration' | null {
  if (!m.isOwner) return null
  if (!m.apartment) return 'no_apartment'
  if (m.ownershipDeclarations.length === 0) return 'no_declaration'
  return null
}
