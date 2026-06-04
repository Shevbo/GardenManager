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
  if (r.doc.status === 'signed') return NextResponse.json({ error: 'Документ подписан, изменение запрещено' }, { status: 409 })
  const b = await req.json().catch(() => ({})) as { title?: string; fieldValues?: Record<string, string> }
  const updated = await prisma.generatedDocument.update({
    where: { id },
    data: { title: b.title ?? r.doc.title, fieldValues: b.fieldValues ?? (r.doc.fieldValues as object) },
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
