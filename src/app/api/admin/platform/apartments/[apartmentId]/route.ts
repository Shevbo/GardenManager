import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ apartmentId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { apartmentId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { number, floor, entrance, areaSqm } = body as {
    number?: string; floor?: number | null; entrance?: number | null; areaSqm?: number | null
  }

  const data: { number?: string; floor?: number | null; entrance?: number | null; areaSqm?: number | null } = {}
  if (typeof number === 'string' && number.trim()) data.number = number.trim()
  if (floor === null || typeof floor === 'number') data.floor = floor
  if (entrance === null || typeof entrance === 'number') data.entrance = entrance
  if (areaSqm === null || typeof areaSqm === 'number') data.areaSqm = areaSqm
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  try {
    const apartment = await prisma.apartment.update({
      where: { id: apartmentId }, data,
      select: { id: true, number: true, floor: true, entrance: true, areaSqm: true },
    })
    return NextResponse.json({ apartment })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Квартира с таким номером уже есть' }, { status: 409 })
    }
    throw e
  }
}

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
