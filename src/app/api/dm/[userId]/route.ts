import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requirePhoneVerified } from '@/lib/permissions'
import { notifyDM } from '@/lib/notify'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id
  const { userId: peer } = await params

  const { searchParams } = new URL(req.url)
  const sinceParam = searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : undefined

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromUserId: me, toUserId: peer },
        { fromUserId: peer, toUserId: me },
      ],
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: since ? 200 : 100,
    select: { id: true, text: true, createdAt: true, fromUserId: true },
  })
  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user.id
  const { userId: peer } = await params

  const gate = await requirePhoneVerified(me)
  if (gate) return gate

  if (peer === me) return NextResponse.json({ error: 'Нельзя написать самому себе' }, { status: 400 })
  const peerUser = await prisma.user.findUnique({ where: { id: peer }, select: { id: true } })
  if (!peerUser) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { text } = body as { text?: string }
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'text too long' }, { status: 400 })

  const message = await prisma.directMessage.create({
    data: { fromUserId: me, toUserId: peer, text: text.trim() },
    select: { id: true, text: true, createdAt: true, fromUserId: true },
  })

  const meUser = await prisma.user.findUnique({ where: { id: me }, select: { name: true, email: true } })
  const fromName = meUser?.name || meUser?.email || 'Участник'
  await notifyDM(peer, fromName, `/chats/dm/${me}`, message.text.slice(0, 120))

  return NextResponse.json({ message })
}
