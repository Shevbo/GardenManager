import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { applyRecommendation } from '@/lib/deepseek'

/**
 * «Согласен — применить к тексту документа»: берёт ответ юриста ИИ (assistant-сообщение)
 * и внедряет его рекомендацию в draftText документа. Только для черновика (DRAFT).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: { orgId: true, status: true, draftText: true },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({ where: { userId: session.user.id, orgId: petition.orgId } })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (petition.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Применить к тексту можно только в статусе «Черновик»' }, { status: 400 })
  }

  const b = await req.json().catch(() => null) as { messageId?: string } | null
  if (!b?.messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  const msg = await prisma.petitionLawyerMessage.findUnique({ where: { id: b.messageId } })
  if (!msg || msg.petitionId !== id || msg.role !== 'assistant') {
    return NextResponse.json({ error: 'Ответ юриста не найден' }, { status: 404 })
  }

  try {
    const revised = await applyRecommendation(petition.draftText, msg.content)
    const updated = await prisma.petition.update({
      where: { id },
      data: { draftText: revised, aiSummary: null }, // reset summary — text changed
      select: { id: true, draftText: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Ошибка обработки ИИ' }, { status: 502 })
  }
}
