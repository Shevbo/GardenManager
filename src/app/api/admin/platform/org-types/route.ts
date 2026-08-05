import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

function normCode(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)
}

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { userId: session.user.id }
}

export async function GET() {
  const a = await requireAdmin()
  if (a instanceof NextResponse) return a
  const types = await prisma.orgTypeRef.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  // usage counts so the UI can block deletion of in-use types
  const used = await prisma.organization.groupBy({ by: ['type'], _count: { _all: true } })
  const usage: Record<string, number> = {}
  for (const u of used) usage[u.type] = u._count._all
  return NextResponse.json({ types: types.map(t => ({ ...t, usage: usage[t.code] ?? 0 })) })
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin()
  if (a instanceof NextResponse) return a

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { code, label, sortOrder } = body as { code?: string; label?: string; sortOrder?: number }
  if (!label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })
  // Derive a code from the (possibly Cyrillic) label; fall back to a generated
  // code so a Russian-only label with no explicit code still works.
  const c = normCode(code || label) || `t${Date.now().toString(36)}`

  const exists = await prisma.orgTypeRef.findUnique({ where: { code: c }, select: { code: true } })
  if (exists) return NextResponse.json({ error: 'Такой код уже есть' }, { status: 409 })

  const type = await prisma.orgTypeRef.create({
    data: { code: c, label: label.trim(), sortOrder: typeof sortOrder === 'number' ? sortOrder : 0 },
  })
  return NextResponse.json({ type }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const a = await requireAdmin()
  if (a instanceof NextResponse) return a

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { code, label, sortOrder, active } = body as { code?: string; label?: string; sortOrder?: number; active?: boolean }
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const data: { label?: string; sortOrder?: number; active?: boolean } = {}
  if (typeof label === 'string' && label.trim()) data.label = label.trim()
  if (typeof sortOrder === 'number') data.sortOrder = sortOrder
  if (typeof active === 'boolean') data.active = active
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const type = await prisma.orgTypeRef.update({ where: { code }, data })
  return NextResponse.json({ type })
}

export async function DELETE(req: NextRequest) {
  const a = await requireAdmin()
  if (a instanceof NextResponse) return a

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { code } = body as { code?: string }
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const inUse = await prisma.organization.count({ where: { type: code } })
  if (inUse > 0) {
    return NextResponse.json({ error: `Тип используют ${inUse} орг. — деактивируйте вместо удаления` }, { status: 409 })
  }
  await prisma.orgTypeRef.delete({ where: { code } })
  return NextResponse.json({ ok: true })
}
