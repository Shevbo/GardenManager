import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified, isPlatformAdmin } from '@/lib/permissions'
import { getUserGovRoles } from '@/lib/org-roles'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

async function access(userId: string, assemblyId: string) {
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId }, select: { id: true, orgId: true } })
  if (!assembly) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const membership = await prisma.membership.findFirst({ where: { userId, orgId: assembly.orgId }, select: { role: true } })
  if (!membership) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const [platAdmin, govRoles] = await Promise.all([isPlatformAdmin(userId), getUserGovRoles(userId, assembly.orgId)])
  const canManage = platAdmin || ADMIN_ROLES.includes(membership.role) ||
    govRoles.some(r => r === 'chairman' || r === 'vice_chairman' || r === 'secretary' || r === 'org_admin')
  return { assembly, canManage }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const g = await access(session.user.id, id)
  if ('error' in g) return g.error

  const [tasks, memberRows] = await Promise.all([
    prisma.assemblyTask.findMany({
      where: { assemblyId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, text: true, dueDate: true, done: true, createdAt: true, assignee: { select: { id: true, name: true, email: true } } },
    }),
    g.canManage
      ? prisma.membership.findMany({ where: { orgId: g.assembly.orgId }, select: { userId: true, user: { select: { name: true, email: true } } } })
      : Promise.resolve([]),
  ])
  const seen = new Set<string>()
  const members = memberRows.filter(m => !seen.has(m.userId) && seen.add(m.userId)).map(m => ({ id: m.userId, label: m.user.name || m.user.email || m.userId }))
  return NextResponse.json({ tasks, canManage: g.canManage, members })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await requirePhoneVerified(session.user.id)
  if (gate) return gate

  const { id } = await params
  const g = await access(session.user.id, id)
  if ('error' in g) return g.error
  if (!g.canManage) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { text, assigneeUserId, dueDate } = body as { text?: string; assigneeUserId?: string | null; dueDate?: string | null }
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  // If an assignee is given, they must be a member of the assembly's org.
  if (assigneeUserId) {
    const m = await prisma.membership.findFirst({ where: { userId: assigneeUserId, orgId: g.assembly.orgId }, select: { id: true } })
    if (!m) return NextResponse.json({ error: 'Ответственный не участник организации' }, { status: 400 })
  }

  const task = await prisma.assemblyTask.create({
    data: {
      assemblyId: id,
      text: text.trim(),
      assigneeUserId: assigneeUserId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    select: { id: true, text: true, dueDate: true, done: true, createdAt: true, assignee: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ task }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const g = await access(session.user.id, id)
  if ('error' in g) return g.error
  if (!g.canManage) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { taskId, done } = body as { taskId?: string; done?: boolean }
  if (!taskId || typeof done !== 'boolean') return NextResponse.json({ error: 'taskId, done required' }, { status: 400 })

  await prisma.assemblyTask.updateMany({ where: { id: taskId, assemblyId: id }, data: { done } })
  return NextResponse.json({ ok: true })
}
