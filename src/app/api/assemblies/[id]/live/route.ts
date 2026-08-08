import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Живые интерим-итоги голосования — для комнаты собрания (поллится каждые ~7с).
 * Доступ: только участники организации собрания (изоляция чужих орг).
 * Счётчики в ГОЛОСАХ (1 собственник = 1 голос); м² здесь не отдаём — в
 * интериме они только шумят, юр-подсчёт остаётся в протоколе.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    select: {
      id: true, orgId: true, status: true, startsAt: true, endsAt: true,
      questions: { select: { id: true }, orderBy: { order: 'asc' } },
    },
  })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
    select: { id: true },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [grouped, eligibleOwners] = await Promise.all([
    prisma.assemblyVote.groupBy({
      by: ['questionId', 'choice'],
      where: { question: { assemblyId: id } },
      _count: { _all: true },
    }),
    prisma.membership.findMany({
      where: { orgId: assembly.orgId, isOwner: true },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  const byQuestion = new Map<string, { for: number; against: number; abstain: number }>()
  for (const q of assembly.questions) byQuestion.set(q.id, { for: 0, against: 0, abstain: 0 })
  for (const g of grouped) {
    const row = byQuestion.get(g.questionId)
    if (!row) continue
    if (g.choice === 'FOR') row.for = g._count._all
    else if (g.choice === 'AGAINST') row.against = g._count._all
    else row.abstain = g._count._all
  }

  const questions = assembly.questions.map(q => {
    const c = byQuestion.get(q.id)!
    return { questionId: q.id, for: c.for, against: c.against, abstain: c.abstain, voted: c.for + c.against + c.abstain }
  })
  // Проголосовавших по собранию считаем по максимуму на вопрос: бюллетень
  // атомарный (все вопросы заполняются одной отправкой), так что max = точно.
  const votedCount = questions.reduce((m, q) => Math.max(m, q.voted), 0)

  return NextResponse.json({
    serverNow: new Date().toISOString(),
    startsAt: assembly.startsAt.toISOString(),
    endsAt: assembly.endsAt.toISOString(),
    status: assembly.status,
    votedCount,
    totalEligible: eligibleOwners.length,
    questions,
  })
}
