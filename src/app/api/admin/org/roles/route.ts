import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/permissions'
import { GOV_ROLES } from '@/lib/org-roles'
import type { OrgGovRole } from '@prisma/client'

function isGovRole(r: unknown): r is OrgGovRole {
  return typeof r === 'string' && (GOV_ROLES as string[]).includes(r)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { orgId, role, userId } = body as { orgId?: string; role?: string; userId?: string }

  if (!orgId || !userId || !isGovRole(role)) {
    return NextResponse.json({ error: 'orgId, role, userId required' }, { status: 400 })
  }
  if (!(await isOrgAdmin(session.user.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // The holder must be a member of this org.
  const member = await prisma.membership.findFirst({ where: { userId, orgId }, select: { id: true } })
  if (!member) return NextResponse.json({ error: 'Пользователь не участник этой организации' }, { status: 400 })

  const assignment = await prisma.orgRoleAssignment.upsert({
    where: { orgId_role: { orgId, role } },
    update: { userId, assignedBy: session.user.id, assignedAt: new Date() },
    create: { orgId, role, userId, assignedBy: session.user.id },
    select: { id: true, role: true, userId: true },
  })
  return NextResponse.json({ ok: true, assignment })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { orgId, role } = body as { orgId?: string; role?: string }

  if (!orgId || !isGovRole(role)) {
    return NextResponse.json({ error: 'orgId, role required' }, { status: 400 })
  }
  if (!(await isOrgAdmin(session.user.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.orgRoleAssignment.deleteMany({ where: { orgId, role } })
  return NextResponse.json({ ok: true })
}
