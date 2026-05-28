import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeAddress } from '@/lib/address-match'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { rawAddress } = body as { rawAddress?: string }
  if (!rawAddress?.trim()) {
    return NextResponse.json({ error: 'rawAddress required' }, { status: 400 })
  }

  const normalized = normalizeAddress(rawAddress)
  if (!normalized) {
    return NextResponse.json({ matched: false, normalized })
  }

  const building = await prisma.building.findUnique({
    where: { addressNormalized: normalized },
    include: { org: { select: { id: true, name: true } } },
  })

  if (!building) {
    return NextResponse.json({ matched: false, normalized })
  }

  return NextResponse.json({
    matched: true,
    normalized,
    buildingId: building.id,
    address: building.address,
    org: building.org,
  })
}
