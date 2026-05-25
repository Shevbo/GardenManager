import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const m = await prisma.membership.findFirst({
    where: { userId, role: 'platform_admin' },
  })
  return !!m
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activities = await prisma.activity.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { memberships: true } },
      memberships: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  })

  return NextResponse.json({ activities })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name } = body as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const activity = await prisma.activity.create({
    data: { name: name.trim(), orgId: null },
  })

  return NextResponse.json(activity, { status: 201 })
}
