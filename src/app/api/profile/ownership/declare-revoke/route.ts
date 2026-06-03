import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { membershipId } = body as { membershipId?: string }
  if (!membershipId) return NextResponse.json({ error: 'missing membershipId' }, { status: 400 })

  const m = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (m.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.$transaction([
    prisma.ownershipDeclaration.deleteMany({ where: { membershipId, userId: session.user.id } }),
    prisma.membership.update({ where: { id: membershipId }, data: { areaSqm: null } }),
  ])

  return NextResponse.json({ ok: true })
}
