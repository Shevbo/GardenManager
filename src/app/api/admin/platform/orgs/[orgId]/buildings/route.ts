import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

function normalize(addr: string): string {
  return addr.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { address } = body as { address?: string }
  if (!address?.trim()) return NextResponse.json({ error: 'address required' }, { status: 400 })

  const addressNormalized = normalize(address)

  const existing = await prisma.building.findUnique({ where: { addressNormalized } })
  if (existing) {
    if (existing.orgId === orgId) {
      return NextResponse.json({ error: 'Building already exists in this org', buildingId: existing.id }, { status: 409 })
    }
    return NextResponse.json({ error: 'Building with this address belongs to another org' }, { status: 409 })
  }

  const building = await prisma.building.create({
    data: { orgId, address: address.trim(), addressNormalized, createdBy: session.user.id },
    select: { id: true, address: true, addressNormalized: true, createdAt: true },
  })
  return NextResponse.json({ building }, { status: 201 })
}
