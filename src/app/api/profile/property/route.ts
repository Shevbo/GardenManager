import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.propertyOwnership.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { address, addressNormalized, apartmentNumber, areaSqm, sharePercent } = body as {
    address?: string
    addressNormalized?: string
    apartmentNumber?: string
    areaSqm?: number
    sharePercent?: number
  }

  if (!address?.trim()) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }

  // Building actualization: deduplicate by addressNormalized or just create
  let building
  const normKey = addressNormalized?.trim() || null

  if (normKey) {
    building = await prisma.building.upsert({
      where: { addressNormalized: normKey },
      update: {},
      create: {
        address: address.trim(),
        addressNormalized: normKey,
        createdBy: session.user.id,
        orgId: null,
      },
    })
  } else {
    // No normalized key — just create (no dedup)
    building = await prisma.building.create({
      data: {
        address: address.trim(),
        addressNormalized: null,
        createdBy: session.user.id,
        orgId: null,
      },
    })
  }

  // Resolve orgName
  let orgName: string = 'Без организации'
  if (building.orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: building.orgId },
      select: { name: true },
    })
    if (org) orgName = org.name
  }

  const item = await prisma.propertyOwnership.create({
    data: {
      userId: session.user.id,
      address: address.trim(),
      addressNormalized: normKey,
      apartmentNumber: apartmentNumber?.trim() || null,
      areaSqm: areaSqm ?? null,
      sharePercent: sharePercent ?? null,
      orgId: building.orgId ?? null,
      orgName,
      buildingId: building.id,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
