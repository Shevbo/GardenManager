import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

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
