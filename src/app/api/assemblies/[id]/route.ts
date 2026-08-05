import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified, isPlatformAdmin } from '@/lib/permissions'
import { getUserGovRoles } from '@/lib/org-roles'
import { notifyAssemblyStatus } from '@/lib/notify'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик', ANNOUNCED: 'Объявлено', VOTING: 'Идёт голосование', CLOSED: 'Закрыто',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: {
      org: { select: { id: true, name: true } },
      createdByUser: { select: { name: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(assembly)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const assembly = await prisma.assembly.findUnique({ where: { id } })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Governance gate: the chairman/deputy (or an admin) APPROVE formal actions —
  // announcing the agenda and closing the assembly. The secretary may prepare
  // and publish but not close. Platform-admin and admin memberships keep access.
  const [platAdmin, govRoles] = await Promise.all([
    isPlatformAdmin(session.user.id),
    getUserGovRoles(session.user.id, assembly.orgId),
  ])
  const isChair = govRoles.includes('chairman') || govRoles.includes('vice_chairman')
  const isSecretary = govRoles.includes('secretary')
  const isAdminRole = platAdmin || ADMIN_ROLES.includes(membership.role) || govRoles.includes('org_admin')
  const canApprove = isChair || isAdminRole
  const canPublish = canApprove || isSecretary
  if (!canPublish) {
    return NextResponse.json({ error: 'Формальные действия по собранию доступны председателю, секретарю или администратору' }, { status: 403 })
  }

  const { status, confirm } = body as {
    status?: 'DRAFT' | 'ANNOUNCED' | 'VOTING' | 'CLOSED'
    confirm?: boolean
  }
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  // Closing is an approval action — chairman/deputy or admin only (not secretary).
  if (status === 'CLOSED' && !canApprove) {
    return NextResponse.json({ error: 'Закрыть собрание может только председатель или администратор' }, { status: 403 })
  }

  // GARD-3 HITL fail-closed: closing an assembly is irreversible (no transition
  // out of CLOSED) and triggers the official protocol. Never act without an
  // explicit human confirmation — default is to NOT close.
  if (status === 'CLOSED' && confirm !== true) {
    return NextResponse.json(
      {
        error: 'Закрытие собрания необратимо — требуется подтверждение',
        requiresConfirmation: true,
      },
      { status: 409 }
    )
  }

  const transitions: Record<string, string[]> = {
    DRAFT: ['ANNOUNCED'],
    ANNOUNCED: ['VOTING', 'DRAFT'],
    VOTING: ['CLOSED'],
    CLOSED: [],
  }
  if (!transitions[assembly.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${assembly.status} to ${status}` },
      { status: 400 }
    )
  }

  const updated = await prisma.assembly.update({
    where: { id },
    data: {
      status,
      ...(status === 'CLOSED' ? { closedAt: new Date() } : {}),
    },
  })

  // Notify the org's members of the status change (respects their prefs).
  await notifyAssemblyStatus(assembly.orgId, session.user.id, id, assembly.title, STATUS_LABEL[status] ?? status)

  return NextResponse.json(updated)
}
