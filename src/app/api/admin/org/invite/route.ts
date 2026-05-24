import { NextRequest, NextResponse } from 'next/server'
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

  const links = await prisma.inviteLink.findMany({
    where: { orgId, usedBy: null },
    include: { apartment: { include: { building: { select: { address: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ links })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { apartmentId, ttlDays = 7 } = await req.json()

  if (apartmentId) {
    const apt = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: { building: { select: { orgId: true } } },
    })
    if (!apt || apt.building.orgId !== orgId) {
      return NextResponse.json({ error: 'Apartment not in your org' }, { status: 400 })
    }
  }

  const link = await prisma.inviteLink.create({
    data: {
      orgId,
      createdBy: session.user.id,
      apartmentId: apartmentId || null,
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
    },
  })

  return NextResponse.json({ link }, { status: 201 })
}
