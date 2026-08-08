import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

const ALLOWED_EMOJI = ['❤️', '👍', '👎', '😮', '🔥', '🤝', '💪', '🙏', '😱']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reactions = await prisma.petitionReaction.findMany({
    where: { petitionId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(reactions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { emoji } = body as { emoji?: string }
  if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userId = session.user.id

  // Одна реакция на пользователя: клик по своему смайлу снимает её, по другому —
  // заменяет. deleteMany, а не delete: старые данные могли накопить несколько строк.
  const mine = await prisma.petitionReaction.findMany({ where: { petitionId: id, userId } })
  const clickedSame = mine.some(r => r.emoji === emoji)
  await prisma.petitionReaction.deleteMany({ where: { petitionId: id, userId } })

  if (clickedSame) {
    return NextResponse.json({ added: false })
  }

  await prisma.petitionReaction.create({ data: { petitionId: id, userId, emoji } })
  return NextResponse.json({ added: true }, { status: 201 })
}
