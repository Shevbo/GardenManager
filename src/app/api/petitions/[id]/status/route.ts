import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canTransition, canGoBack, PetitionStatus } from '@/lib/petition-status'
import { canManageOrgWorkflow, WORKFLOW_FORBIDDEN_MESSAGE } from '@/lib/permissions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { status } = body as { status?: string }
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Переводить статусы могут админ / секретарь / председатель+зам (см. permissions).
  if (!(await canManageOrgWorkflow(session.user.id, petition.orgId))) {
    return NextResponse.json({ error: WORKFLOW_FORBIDDEN_MESSAGE }, { status: 403 })
  }

  const current = petition.status as PetitionStatus
  const target = status as PetitionStatus
  const isForward = canTransition(current, target)
  const isBackward = canGoBack(current) === target

  if (!isForward && !isBackward) {
    return NextResponse.json(
      { error: `Cannot transition from ${current} to ${target}` },
      { status: 400 }
    )
  }

  const updated = await prisma.petition.update({
    where: { id },
    data: { status: target },
  })

  return NextResponse.json(updated)
}
