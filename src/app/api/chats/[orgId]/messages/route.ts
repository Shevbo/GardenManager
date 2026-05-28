import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId } = await params

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const sinceParam = searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : undefined

  const messages = await prisma.chatMessage.findMany({
    where: { orgId, ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: since ? 200 : 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ messages })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  const { orgId } = await params

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text } = body as { text?: string }
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'text too long' }, { status: 400 })

  const message = await prisma.chatMessage.create({
    data: { orgId, userId: session.user.id, text: text.trim() },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
