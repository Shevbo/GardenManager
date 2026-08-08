import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requirePhoneVerified, canManageOrgWorkflow } from '@/lib/permissions'
import { getActiveOrgId } from '@/lib/active-org'
import { notifyAgenda } from '@/lib/notify'

/**
 * «Вёрстка повестки»: предложения тем в повестку будущего собрания.
 * GET  — список предложений активной орги (любой участник).
 * POST — предложить тему (собственник или управляющий своей орги).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = new URL(req.url).searchParams.get('org') ?? await getActiveOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ proposals: [], canDecide: false })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId }, select: { id: true },
  })
  const canDecide = await canManageOrgWorkflow(session.user.id, orgId)
  if (!membership && !canDecide) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [rows, org, myVotes, isOwnerRow] = await Promise.all([
    prisma.assemblyTopicProposal.findMany({
      where: { orgId },
      take: 200,
      select: {
        id: true, title: true, description: true, status: true, createdAt: true,
        decidedAt: true, decisionNote: true, assemblyId: true,
        author: { select: { id: true, name: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { agendaVoteLimit: true } }),
    prisma.assemblyTopicVote.findMany({
      where: { userId: session.user.id, proposal: { orgId } },
      select: { proposalId: true },
    }),
    prisma.membership.findFirst({
      where: { userId: session.user.id, orgId, isOwner: true }, select: { id: true },
    }),
  ])

  const myVoted = new Set(myVotes.map(v => v.proposalId))
  // Хит-парад: по голосам (убыв.), при равенстве — новее выше.
  const proposals = rows
    .map(r => ({ ...r, votes: r._count.votes, myVote: myVoted.has(r.id) }))
    .sort((a, b) => b.votes - a.votes || b.createdAt.getTime() - a.createdAt.getTime())

  const limit = org?.agendaVoteLimit ?? 5
  const usedOpen = rows.filter(r => myVoted.has(r.id) && (r.status === 'PROPOSED' || r.status === 'ACCEPTED')).length

  return NextResponse.json({
    proposals, canDecide, meId: session.user.id,
    canVote: !!isOwnerRow,
    voteLimit: limit,
    votesRemaining: Math.max(0, limit - usedOpen),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await requirePhoneVerified(session.user.id)
  if (gate) return gate

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { title, description, orgId: bodyOrgId } = body as { title?: string; description?: string; orgId?: string }
  if (!title?.trim()) return NextResponse.json({ error: 'Сформулируйте тему предложения' }, { status: 400 })

  const orgId = bodyOrgId ?? await getActiveOrgId(session.user.id)
  if (!orgId) return NextResponse.json({ error: 'Не выбрана организация' }, { status: 400 })

  // Предлагают собственники (или управляющие) СВОЕЙ организации.
  const isOwner = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId, isOwner: true }, select: { id: true },
  })
  if (!isOwner && !(await canManageOrgWorkflow(session.user.id, orgId))) {
    return NextResponse.json(
      { error: 'Предлагать темы в повестку могут собственники этой организации.' },
      { status: 403 },
    )
  }

  const proposal = await prisma.assemblyTopicProposal.create({
    data: {
      orgId,
      title: title.trim().slice(0, 300),
      description: description?.trim().slice(0, 4000) || null,
      createdBy: session.user.id,
    },
    select: { id: true, title: true, status: true },
  })

  // Управляющим — сигнал о новом предложении (по их prefs, best-effort).
  try {
    const managers = await prisma.orgRoleAssignment.findMany({
      where: { orgId, role: { in: ['chairman', 'vice_chairman', 'secretary', 'org_admin'] } },
      select: { userId: true }, distinct: ['userId'],
    })
    const author = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
    await Promise.all(managers
      .filter(m => m.userId !== session.user!.id)
      .map(m => notifyAgenda(m.userId, 'Новое предложение в повестку собрания',
        `${author?.name ?? 'Собственник'}: «${proposal.title}»`)))
  } catch { /* уведомления не должны ломать создание */ }

  return NextResponse.json({ proposal }, { status: 201 })
}
