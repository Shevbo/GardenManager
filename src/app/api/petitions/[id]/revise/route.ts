import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revisePetitionWithComments } from '@/lib/deepseek'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      comments: { include: { user: { select: { name: true, email: true } } } },
    },
  })

  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (petition.status !== 'AI_REVISION') {
    return NextResponse.json({ error: 'Petition must be in AI_REVISION status' }, { status: 400 })
  }
  if (petition.comments.length === 0) {
    return NextResponse.json({ error: 'No comments to revise' }, { status: 400 })
  }

  const { revisedText, summary } = await revisePetitionWithComments(
    petition.draftText,
    petition.comments
  )

  const revision = await prisma.petitionAIRevision.create({
    data: {
      petitionId: id,
      inputDraft: petition.draftText,
      inputComments: petition.comments.map(c => ({ text: c.text, userId: c.userId })),
      aiSuggestion: revisedText,
      aiSummary: summary,
    },
  })

  return NextResponse.json(revision)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { finalText, revisionId } = await req.json()
  if (!finalText || !revisionId) {
    return NextResponse.json({ error: 'finalText and revisionId required' }, { status: 400 })
  }

  const [revision, petition] = await Promise.all([
    prisma.petitionAIRevision.update({
      where: { id: revisionId },
      data: { finalText, approvedAt: new Date(), approvedBy: session.user.id },
    }),
    prisma.petition.update({
      where: { id },
      data: { finalText },
    }),
  ])

  return NextResponse.json({ revision, petition })
}
