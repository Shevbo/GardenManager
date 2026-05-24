import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const ALLOWED_EMOJI = ['❤️', '👍', '👎', '😮', '🔥', '🤝', '💪', '🙏', '😱']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params

  const reactions = await prisma.commentReaction.findMany({
    where: { commentId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(reactions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, commentId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { emoji } = body as { emoji?: string }
  if (!emoji || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  const comment = await prisma.petitionComment.findUnique({
    where: { id: commentId },
  })
  if (!comment || comment.petitionId !== id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const userId = session.user.id

  const existing = await prisma.commentReaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId, emoji } },
  })

  if (existing) {
    await prisma.commentReaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ added: false })
  }

  await prisma.commentReaction.create({ data: { commentId, userId, emoji } })
  return NextResponse.json({ added: true }, { status: 201 })
}
