import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { org: { createdAt: 'asc' } },
  })

  return NextResponse.json({ orgId: membership?.orgId ?? null })
}
