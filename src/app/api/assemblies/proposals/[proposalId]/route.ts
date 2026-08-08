import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canManageOrgWorkflow, WORKFLOW_FORBIDDEN_MESSAGE } from '@/lib/permissions'
import { notifyAgenda } from '@/lib/notify'

/** Решение по предложению темы: председатель/зам/секретарь/админ принимает или отклоняет. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { proposalId } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { action, note } = body as { action?: 'accept' | 'reject'; note?: string }
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be accept|reject' }, { status: 400 })
  }

  const proposal = await prisma.assemblyTopicProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, orgId: true, title: true, status: true, createdBy: true },
  })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!(await canManageOrgWorkflow(session.user.id, proposal.orgId))) {
    return NextResponse.json({ error: WORKFLOW_FORBIDDEN_MESSAGE }, { status: 403 })
  }
  if (proposal.status === 'INCLUDED') {
    return NextResponse.json({ error: 'Тема уже включена в повестку собрания.' }, { status: 409 })
  }

  const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED'
  const updated = await prisma.assemblyTopicProposal.update({
    where: { id: proposalId },
    data: {
      status,
      decidedBy: session.user.id,
      decidedAt: new Date(),
      decisionNote: note?.trim().slice(0, 1000) || null,
    },
    select: { id: true, status: true },
  })

  // Автору — уведомление о решении (по его prefs, best-effort).
  try {
    if (proposal.createdBy !== session.user.id) {
      await notifyAgenda(
        proposal.createdBy,
        status === 'ACCEPTED'
          ? `Ваша тема принята в повестку: «${proposal.title}»`
          : `Ваша тема отклонена: «${proposal.title}»`,
        note?.trim() || undefined,
      )
    }
  } catch { /* best-effort */ }

  return NextResponse.json({ proposal: updated })
}
