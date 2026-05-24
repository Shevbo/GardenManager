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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: buildingId } = await params

  const building = await prisma.building.findUnique({ where: { id: buildingId } })
  if (!building || building.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const apartments = await prisma.apartment.findMany({
    where: { buildingId },
    include: { memberships: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { number: 'asc' },
  })

  return NextResponse.json({ apartments })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: buildingId } = await params

  const building = await prisma.building.findUnique({ where: { id: buildingId } })
  if (!building || building.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { number, floor, entrance, areaSqm } = await req.json()
  if (!number?.trim()) return NextResponse.json({ error: 'Apartment number required' }, { status: 400 })

  const apartment = await prisma.apartment.create({
    data: {
      buildingId,
      number: number.trim(),
      floor: floor ? parseInt(floor) : null,
      entrance: entrance ? parseInt(entrance) : null,
      areaSqm: areaSqm ? parseFloat(areaSqm) : null,
    },
  })

  return NextResponse.json({ apartment }, { status: 201 })
}
