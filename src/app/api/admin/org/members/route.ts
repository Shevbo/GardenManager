import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function getAdminOrgId(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, role: { in: ['org_admin', 'platform_admin'] } },
    select: { orgId: true },
  })
  return membership?.orgId ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getAdminOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await prisma.membership.findMany({
    where: { orgId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      apartment: { include: { building: { select: { address: true } } } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return NextResponse.json({ members })
}
