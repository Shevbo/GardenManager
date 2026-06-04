import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

async function guard() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (g) return g
  const { id } = await params
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const k of ['category', 'title', 'description', 'scope', 'layoutKey', 'bodyTemplate', 'variables', 'isActive'] as const) {
    if (k in b) data[k] = b[k]
  }
  const updated = await prisma.documentTemplate.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (g) return g
  const { id } = await params
  const used = await prisma.generatedDocument.count({ where: { templateId: id } })
  if (used > 0) return NextResponse.json({ error: 'Шаблон используется в документах, удаление запрещено' }, { status: 409 })
  await prisma.documentTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
