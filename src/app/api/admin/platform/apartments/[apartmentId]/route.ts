import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function DELETE(_req: Request, { params }: { params: Promise<{ apartmentId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { apartmentId } = await params

  const memberships = await prisma.membership.count({ where: { apartmentId } })
  if (memberships > 0) {
    return NextResponse.json(
      { error: `Сначала отвяжите ${memberships} участник(ов) от этой квартиры` },
      { status: 409 },
    )
  }

  await prisma.apartment.delete({ where: { id: apartmentId } })
  return NextResponse.json({ ok: true })
}
