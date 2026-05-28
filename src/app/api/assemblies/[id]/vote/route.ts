import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

type VoteChoice = 'FOR' | 'AGAINST' | 'ABSTAIN'

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

  const { votes } = body as { votes?: Array<{ questionId: string; choice: VoteChoice }> }
  if (!votes || !Array.isArray(votes) || votes.length === 0) {
    return NextResponse.json({ error: 'votes required' }, { status: 400 })
  }

  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: { questions: { select: { id: true } } },
  })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (assembly.status !== 'VOTING') {
    return NextResponse.json({ error: 'Voting is not open' }, { status: 400 })
  }

  const now = new Date()
  if (now < assembly.startsAt || now > assembly.endsAt) {
    return NextResponse.json({ error: 'Voting period inactive' }, { status: 400 })
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!membership.isOwner) {
    return NextResponse.json({ error: 'Only owners can vote' }, { status: 403 })
  }
  const areaSqm = membership.areaSqm ?? 0
  if (areaSqm <= 0) {
    return NextResponse.json({ error: 'Membership area is not set (admin must verify your area)' }, { status: 400 })
  }

  const validQuestionIds = new Set(assembly.questions.map(q => q.id))
  for (const v of votes) {
    if (!validQuestionIds.has(v.questionId)) {
      return NextResponse.json({ error: `Invalid questionId: ${v.questionId}` }, { status: 400 })
    }
    if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(v.choice)) {
      return NextResponse.json({ error: 'invalid choice' }, { status: 400 })
    }
  }

  await prisma.$transaction(
    votes.map(v =>
      prisma.assemblyVote.upsert({
        where: { questionId_userId: { questionId: v.questionId, userId: session.user!.id } },
        update: { choice: v.choice, areaSqm, isOwner: true },
        create: {
          questionId: v.questionId,
          userId: session.user!.id,
          choice: v.choice,
          areaSqm,
          isOwner: true,
        },
      })
    )
  )

  return NextResponse.json({ ok: true, count: votes.length })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    select: { orgId: true },
  })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const votes = await prisma.assemblyVote.findMany({
    where: { question: { assemblyId: id }, userId: session.user.id },
    select: { questionId: true, choice: true, castAt: true },
  })

  return NextResponse.json({ votes })
}
