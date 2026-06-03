import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function POST(req: NextRequest, { params }: { params: Promise<{ buildingId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { buildingId } = await params
  const building = await prisma.building.findUnique({ where: { id: buildingId }, select: { id: true } })
  if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { number, floor, entrance, areaSqm } = body as {
    number?: string; floor?: number; entrance?: number; areaSqm?: number
  }
  if (!number?.trim()) return NextResponse.json({ error: 'number required' }, { status: 400 })

  try {
    const apartment = await prisma.apartment.create({
      data: {
        buildingId,
        number: number.trim(),
        floor: typeof floor === 'number' ? floor : null,
        entrance: typeof entrance === 'number' ? entrance : null,
        areaSqm: typeof areaSqm === 'number' ? areaSqm : null,
      },
      select: { id: true, number: true, floor: true, entrance: true, areaSqm: true },
    })
    return NextResponse.json({ apartment }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Квартира с таким номером уже есть в этом здании' }, { status: 409 })
    }
    throw e
  }
}
