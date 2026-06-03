import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

function normalize(addr: string): string {
  return addr.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ buildingId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { buildingId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { address } = body as { address?: string }
  if (!address?.trim()) return NextResponse.json({ error: 'address required' }, { status: 400 })

  try {
    const building = await prisma.building.update({
      where: { id: buildingId },
      data: { address: address.trim(), addressNormalized: normalize(address) },
      select: { id: true, address: true, addressNormalized: true },
    })
    return NextResponse.json({ building })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Здание с таким адресом уже есть' }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ buildingId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { buildingId } = await params

  // Refuse if there are apartments or memberships dependent on apartments here
  const apartments = await prisma.apartment.count({ where: { buildingId } })
  if (apartments > 0) {
    return NextResponse.json(
      { error: `Сначала удалите ${apartments} квартир(ы) в этом здании` },
      { status: 409 },
    )
  }

  await prisma.building.delete({ where: { id: buildingId } })
  return NextResponse.json({ ok: true })
}
