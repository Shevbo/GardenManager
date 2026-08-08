import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified, canManageOrgWorkflow, WORKFLOW_FORBIDDEN_MESSAGE } from '@/lib/permissions'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, ...(orgId ? { orgId } : {}) },
    select: { orgId: true },
  })
  const orgIds = memberships.map(m => m.orgId)
  if (orgIds.length === 0) return NextResponse.json({ assemblies: [] })

  const assemblies = await prisma.assembly.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      org: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  })

  return NextResponse.json({ assemblies })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orgId, title, description, type, startsAt, endsAt, quorumPercent, questions, proposalIds } =
    body as {
      orgId?: string; title?: string; description?: string
      type?: 'online' | 'async_collect'
      startsAt?: string; endsAt?: string; quorumPercent?: number
      questions?: Array<{ text: string; description?: string; requiredMajorityPct?: number }>
      /** «Вёрстка повестки»: принятые предложения, вошедшие в это собрание. */
      proposalIds?: string[]
    }

  if (!orgId || !title?.trim() || !type || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: 'orgId, title, type, startsAt, endsAt required' },
      { status: 400 }
    )
  }
  if (type !== 'online' && type !== 'async_collect') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'at least one question required' }, { status: 400 })
  }

  // Права на созыв — админ / секретарь / председатель+зам (см. permissions).
  if (!(await canManageOrgWorkflow(session.user.id, orgId))) {
    return NextResponse.json({ error: WORKFLOW_FORBIDDEN_MESSAGE }, { status: 403 })
  }

  const assembly = await prisma.assembly.create({
    data: {
      orgId,
      title: title.trim(),
      description: description?.trim() || null,
      type,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      quorumPercent: quorumPercent ?? 50,
      createdBy: session.user.id,
      questions: {
        create: questions.map((q, i) => ({
          order: i,
          text: q.text.trim(),
          description: q.description?.trim() || null,
          requiredMajorityPct: q.requiredMajorityPct ?? 50,
        })),
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  })

  // «Вёрстка повестки»: включённые предложения → INCLUDED + линк на собрание,
  // авторам — уведомление (по prefs, best-effort). Только ACCEPTED своей орги.
  if (proposalIds && Array.isArray(proposalIds) && proposalIds.length > 0) {
    try {
      const included = await prisma.assemblyTopicProposal.findMany({
        where: { id: { in: proposalIds }, orgId, status: 'ACCEPTED' },
        select: { id: true, title: true, createdBy: true },
      })
      await prisma.assemblyTopicProposal.updateMany({
        where: { id: { in: included.map(p => p.id) } },
        data: { status: 'INCLUDED', assemblyId: assembly.id },
      })
      const { notifyAgenda } = await import('@/lib/notify')
      await Promise.all(included
        .filter(p => p.createdBy !== session.user!.id)
        .map(p => notifyAgenda(p.createdBy,
          `Ваша тема вошла в повестку собрания «${assembly.title}»`,
          `«${p.title}» — обсуждение и голосование откроются по расписанию собрания.`)))
    } catch (e) {
      console.error('[assemblies] proposal linking failed:', (e as Error).message)
    }
  }

  return NextResponse.json(assembly, { status: 201 })
}
