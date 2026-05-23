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

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (petition.status !== 'AI_REVISION') {
    return NextResponse.json({ error: 'Petition must be in AI_REVISION status' }, { status: 400 })
  }
  if (petition.comments.length === 0) {
    return NextResponse.json({ error: 'No comments to revise' }, { status: 400 })
  }

  const { revisedText, summary } = await revisePetitionWithComments(
    petition.draftText,
    petition.comments.map(c => ({ text: c.text, user: { name: c.user.name, email: c.user.email } }))
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

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { finalText, revisionId } = body as { finalText?: string; revisionId?: string }
  if (!finalText || !revisionId) {
    return NextResponse.json({ error: 'finalText and revisionId required' }, { status: 400 })
  }

  // Fetch petition to verify membership
  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Verify revision belongs to this petition
  const existingRevision = await prisma.petitionAIRevision.findUnique({ where: { id: revisionId } })
  if (!existingRevision || existingRevision.petitionId !== id) {
    return NextResponse.json({ error: 'Revision not found for this petition' }, { status: 404 })
  }

  const [revision, updatedPetition] = await prisma.$transaction([
    prisma.petitionAIRevision.update({
      where: { id: revisionId },
      data: { finalText, approvedAt: new Date(), approvedBy: session.user.id },
    }),
    prisma.petition.update({
      where: { id },
      data: { finalText },
    }),
  ])

  return NextResponse.json({ revision, petition: updatedPetition })
}
