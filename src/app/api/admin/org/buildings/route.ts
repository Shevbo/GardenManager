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

  const buildings = await prisma.building.findMany({
    where: { orgId },
    include: { _count: { select: { apartments: true } } },
    orderBy: { address: 'asc' },
  })

  return NextResponse.json({ buildings })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { address } = await req.json()
  if (!address?.trim()) return NextResponse.json({ error: 'Address required' }, { status: 400 })

  const building = await prisma.building.create({
    data: { orgId, address: address.trim() },
  })

  return NextResponse.json({ building }, { status: 201 })
}
