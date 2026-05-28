import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id, ...(orgId ? { orgId } : {}) },
    select: { orgId: true },
  })
  const orgIds = memberships.map(m => m.orgId)
  if (orgIds.length === 0) return NextResponse.json({ assemblies: [] })

  const assemblies = await prisma.assembly.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      org: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  })

  return NextResponse.json({ assemblies })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orgId, title, description, type, startsAt, endsAt, quorumPercent, questions } =
    body as {
      orgId?: string; title?: string; description?: string
      type?: 'online' | 'async_collect'
      startsAt?: string; endsAt?: string; quorumPercent?: number
      questions?: Array<{ text: string; description?: string; requiredMajorityPct?: number }>
    }

  if (!orgId || !title?.trim() || !type || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: 'orgId, title, type, startsAt, endsAt required' },
      { status: 400 }
    )
  }
  if (type !== 'online' && type !== 'async_collect') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'at least one question required' }, { status: 400 })
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const assembly = await prisma.assembly.create({
    data: {
      orgId,
      title: title.trim(),
      description: description?.trim() || null,
      type,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      quorumPercent: quorumPercent ?? 50,
      createdBy: session.user.id,
      questions: {
        create: questions.map((q, i) => ({
          order: i,
          text: q.text.trim(),
          description: q.description?.trim() || null,
          requiredMajorityPct: q.requiredMajorityPct ?? 50,
        })),
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(assembly, { status: 201 })
}
