import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function getAdminOrgId(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, role: { in: ['org_admin', 'platform_admin'] } },
    select: { orgId: true },
  })
  return membership?.orgId ?? null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { memberId } = await params
  const { role, isOwner, areaSqm, apartmentId } = await req.json()

  const target = await prisma.membership.findUnique({ where: { id: memberId } })
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.membership.update({
    where: { id: memberId },
    data: {
      ...(role !== undefined && { role }),
      ...(isOwner !== undefined && { isOwner }),
      ...(areaSqm !== undefined && { areaSqm: areaSqm ? parseFloat(areaSqm) : null }),
      ...(apartmentId !== undefined && { apartmentId: apartmentId || null }),
    },
  })

  return NextResponse.json({ member: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { memberId } = await params

  const target = await prisma.membership.findUnique({ where: { id: memberId } })
  if (!target || target.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Prevent removing yourself
  if (target.userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await prisma.membership.delete({ where: { id: memberId } })

  return NextResponse.json({ ok: true })
}
