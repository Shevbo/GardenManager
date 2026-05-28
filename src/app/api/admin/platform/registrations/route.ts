import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null) ?? 'PENDING'

  const items = await prisma.pendingRegistration.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  })

  const grouped = items.reduce<Record<string, number>>((acc, it) => {
    const key = it.addressNormalized ?? ''
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ items, grouped })
}
