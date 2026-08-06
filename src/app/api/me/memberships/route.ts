import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [memberships, typeRefs] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: session.user.id },
      include: {
        org: { select: { id: true, name: true, slug: true, type: true } },
        apartment: { select: { number: true, building: { select: { address: true } } } },
      },
      orderBy: [{ org: { name: 'asc' } }],
    }),
    prisma.orgTypeRef.findMany({ select: { code: true, label: true } }),
  ])
  const typeLabel = new Map(typeRefs.map(t => [t.code, t.label]))

  return NextResponse.json({
    memberships: memberships.map(m => ({
      membershipId: m.id,
      orgId: m.org.id,
      orgName: m.org.name,
      orgSlug: m.org.slug,
      orgType: m.org.type,
      orgTypeLabel: typeLabel.get(m.org.type) ?? m.org.type,
      apartmentNumber: m.apartment?.number ?? null,
      buildingAddress: m.apartment?.building?.address ?? null,
      role: m.role,
      areaSqm: m.areaSqm,
    })),
  })
}
