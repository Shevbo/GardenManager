import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

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
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status } = body as { status?: 'DRAFT' | 'ANNOUNCED' | 'VOTING' | 'CLOSED' }
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

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
  return NextResponse.json(updated)
}
