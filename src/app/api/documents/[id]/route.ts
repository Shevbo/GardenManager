import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function ownDoc(id: string, userId: string) {
  const doc = await prisma.generatedDocument.findUnique({ where: { id } })
  if (!doc) return { err: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (doc.userId !== userId) return { err: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { doc }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const r = await ownDoc(id, session.user.id); if ('err' in r) return r.err

  const b = await req.json().catch(() => ({})) as {
    title?: string
    fieldValues?: Record<string, string>
    petitionId?: string | null
  }

  const isPetitionChange = 'petitionId' in b
  const isContentChange = 'title' in b || 'fieldValues' in b

  // Signed doc cannot have title/fields changed
  if (isContentChange && r.doc.status === 'signed') {
    return NextResponse.json({ error: 'Документ подписан, изменение запрещено' }, { status: 409 })
  }

  // Validate petition attachment if petitionId is being set to a non-null value
  let petitionIdUpdate: { petitionId: string | null } | undefined = undefined
  if (isPetitionChange) {
    if (b.petitionId === null) {
      petitionIdUpdate = { petitionId: null }
    } else if (typeof b.petitionId === 'string' && b.petitionId.length > 0) {
      const petition = await prisma.petition.findUnique({
        where: { id: b.petitionId },
        select: { orgId: true },
      })
      if (!petition) {
        return NextResponse.json({ error: 'Заявление не найдено' }, { status: 404 })
      }
      const membership = await prisma.membership.findFirst({
        where: { userId: session.user.id, orgId: petition.orgId },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Вы не участник этого заявления' }, { status: 403 })
      }
      petitionIdUpdate = { petitionId: b.petitionId }
    }
  }

  const updated = await prisma.generatedDocument.update({
    where: { id },
    data: {
      ...(isContentChange
        ? {
            title: b.title ?? r.doc.title,
            fieldValues: b.fieldValues ?? (r.doc.fieldValues as object),
          }
        : {}),
      ...(petitionIdUpdate ?? {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const r = await ownDoc(id, session.user.id); if ('err' in r) return r.err
  await prisma.generatedDocument.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
