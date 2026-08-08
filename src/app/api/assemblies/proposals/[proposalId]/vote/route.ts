import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requirePhoneVerified } from '@/lib/permissions'

/** Статусы, в которых тема «открыта»: за неё можно голосовать и её голоса занимают лимит. */
const OPEN_STATUSES = ['PROPOSED', 'ACCEPTED']

/**
 * Toggle-голос собственника ЗА включение темы в повестку.
 * Лимит — Organization.agendaVoteLimit (по умолчанию 5): считаются только
 * голоса за ещё открытые темы (ушла в повестку/отклонена → слот освободился).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await requirePhoneVerified(session.user.id)
  if (gate) return gate

  const { proposalId } = await params
  const proposal = await prisma.assemblyTopicProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, orgId: true, status: true, org: { select: { agendaVoteLimit: true } } },
  })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: proposal.orgId, isOwner: true },
    select: { id: true },
  })
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Голосовать за темы повестки могут собственники этой организации.' },
      { status: 403 },
    )
  }

  const existing = await prisma.assemblyTopicVote.findUnique({
    where: { proposalId_userId: { proposalId, userId: session.user.id } },
  })

  if (existing) {
    // Отзыв голоса — всегда можно.
    await prisma.assemblyTopicVote.delete({ where: { id: existing.id } })
  } else {
    if (!OPEN_STATUSES.includes(proposal.status)) {
      return NextResponse.json(
        { error: 'По этой теме голосование уже завершено (она включена в повестку или отклонена).' },
        { status: 409 },
      )
    }
    const limit = proposal.org.agendaVoteLimit
    const used = await prisma.assemblyTopicVote.count({
      where: {
        userId: session.user.id,
        proposal: { orgId: proposal.orgId, status: { in: OPEN_STATUSES } },
      },
    })
    if (used >= limit) {
      return NextResponse.json(
        { error: `Лимит исчерпан: не более ${limit} тем на одно собрание (ваших голосов: ${used}). Отзовите голос с другой темы, чтобы освободить место.` },
        { status: 409 },
      )
    }
    await prisma.assemblyTopicVote.create({ data: { proposalId, userId: session.user.id } })
  }

  const [votes, usedNow] = await Promise.all([
    prisma.assemblyTopicVote.count({ where: { proposalId } }),
    prisma.assemblyTopicVote.count({
      where: { userId: session.user.id, proposal: { orgId: proposal.orgId, status: { in: OPEN_STATUSES } } },
    }),
  ])
  return NextResponse.json({
    voted: !existing,
    votes,
    limit: proposal.org.agendaVoteLimit,
    remaining: Math.max(0, proposal.org.agendaVoteLimit - usedNow),
  })
}
