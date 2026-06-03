import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Role } from '@prisma/client'

const PLATFORM_ADMIN_ROLES: Role[] = ['platform_admin', 'coalition_admin']

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: { in: PLATFORM_ADMIN_ROLES } },
  })
  return !!m
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { membershipId } = await params

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true },
  })
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.ownershipDeclaration.deleteMany({ where: { membershipId } }),
    prisma.membership.delete({ where: { id: membershipId } }),
  ])

  return NextResponse.json({ ok: true })
}
