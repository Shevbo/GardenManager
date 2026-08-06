import { NextRequest, NextResponse } from 'next/server'
import { findBuildingForAddress } from '@/lib/building-lookup'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { rawAddress } = body as { rawAddress?: string }
  if (!rawAddress?.trim()) {
    return NextResponse.json({ error: 'rawAddress required' }, { status: 400 })
  }

  const { normalized, building, candidates } = await findBuildingForAddress(rawAddress)

  if (!building) {
    return NextResponse.json({ matched: false, normalized, candidates })
  }

  return NextResponse.json({
    matched: true,
    normalized,
    buildingId: building.id,
    address: building.address,
    org: building.org,
  })
}
