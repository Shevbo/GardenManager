import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find all orgs the user is a member of
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { orgId: true },
  })
  const orgIds = memberships.map(m => m.orgId)

  // Return petitions in those orgs that are not DRAFT (i.e., publicly active)
  const petitions = await prisma.petition.findMany({
    where: {
      orgId: { in: orgIds },
      status: { not: 'DRAFT' },
    },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ items: petitions })
}
