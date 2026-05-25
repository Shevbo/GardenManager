import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canInteractWithPetition } from '@/lib/petition-access'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const comments = await prisma.petitionComment.findMany({
    where: { petitionId: id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, attachments } = body as { text?: string; attachments?: unknown[] }

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canInteract = await canInteractWithPetition(session.user.id, id)
  if (!canInteract) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const comment = await prisma.petitionComment.create({
    data: {
      petitionId: id,
      userId: session.user.id,
      text: text.trim(),
      attachments: attachments != null ? (attachments as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
