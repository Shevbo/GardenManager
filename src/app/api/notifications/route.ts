import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
  ])
  return NextResponse.json({ unread, items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const { id, all } = body as { id?: string; all?: boolean }

  if (all) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
  } else if (id) {
    await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } })
  } else {
    return NextResponse.json({ error: 'id or all required' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
