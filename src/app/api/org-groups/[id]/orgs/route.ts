import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: orgGroupId } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { organizationId } = body as { organizationId?: string }
  if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 })

  const membership = await prisma.orgGroupMembership.upsert({
    where: { orgGroupId_organizationId: { orgGroupId, organizationId } },
    create: { orgGroupId, organizationId },
    update: {},
  })

  return NextResponse.json(membership, { status: 201 })
}
