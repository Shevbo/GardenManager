import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const m = await prisma.membership.findFirst({ where: { userId: session.user.id, orgId: petition.orgId, role: { in: ['org_admin', 'council_member', 'coalition_admin'] } } })
  if (!m && !(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const items = await prisma.generatedDocument.findMany({
    where: { petitionId: id, status: 'signed' },
    include: { user: { select: { name: true } }, template: { select: { title: true } } },
    orderBy: { signedAt: 'asc' },
  })
  return NextResponse.json({ items })
}
