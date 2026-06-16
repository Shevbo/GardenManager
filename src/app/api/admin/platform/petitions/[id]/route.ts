import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { isPetitionStatus } from '@/lib/petition-status'

/**
 * Platform-admin "god mode" for the petition repository.
 * Unlike the user-facing /api/petitions/[id] route, this bypasses workflow
 * gates: any field is editable in any status, status can jump anywhere, and
 * petitions can be force-deleted even with signatures. Guarded strictly by
 * isPlatformAdmin — never expose to regular org members.
 */

async function requireSuperadmin() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!(await isPlatformAdmin(session.user.id))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { userId: session.user.id }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperadmin()
  if (gate.error) return gate.error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const petition = await prisma.petition.findUnique({ where: { id }, select: { id: true } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const b = body as Record<string, unknown>

  if (b.status !== undefined && !isPetitionStatus(b.status)) {
    return NextResponse.json({ error: `Invalid status: ${String(b.status)}` }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const trimOrNull = (v: unknown) => {
    const s = str(v)
    if (s === undefined) return undefined
    return s.trim() || null
  }
  const dateOrNull = (v: unknown) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    const d = new Date(v as string)
    return isNaN(d.getTime()) ? undefined : d
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (b.status !== undefined) data.status = b.status
  if (b.title !== undefined && str(b.title)) data.title = str(b.title)!.trim()
  if (b.draftText !== undefined && typeof b.draftText === 'string') data.draftText = b.draftText
  if (b.finalText !== undefined) data.finalText = b.finalText === null ? null : str(b.finalText) ?? undefined
  if (b.recipient !== undefined) data.recipient = trimOrNull(b.recipient)
  if (b.senderLine !== undefined) data.senderLine = trimOrNull(b.senderLine)
  if (b.aiSummary !== undefined) data.aiSummary = b.aiSummary === null ? null : str(b.aiSummary)
  if (b.isPublic !== undefined) data.isPublic = !!b.isPublic
  if (b.discussionDeadline !== undefined) {
    const d = dateOrNull(b.discussionDeadline); if (d !== undefined) data.discussionDeadline = d
  }
  if (b.signingDeadline !== undefined) {
    const d = dateOrNull(b.signingDeadline); if (d !== undefined) data.signingDeadline = d
  }
  if (b.orgId !== undefined && str(b.orgId)) data.orgId = str(b.orgId)
  if (b.orgGroupId !== undefined) data.orgGroupId = b.orgGroupId === null ? null : str(b.orgGroupId)
  if (b.activityId !== undefined) data.activityId = b.activityId === null ? null : str(b.activityId)
  if (b.templateId !== undefined) data.templateId = b.templateId === null ? null : str(b.templateId)
  if (b.fieldValues !== undefined) data.fieldValues = b.fieldValues ?? null
  if (b.appendixTemplateIds !== undefined) data.appendixTemplateIds = b.appendixTemplateIds ?? null

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
  }

  const updated = await prisma.petition.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperadmin()
  if (gate.error) return gate.error

  const { id } = await params
  const petition = await prisma.petition.findUnique({ where: { id }, select: { id: true } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Force delete: signatures are onDelete:Restrict (block the petition delete),
  // and generated documents cascade — but those are users' personal "Мои документы",
  // so detach them rather than destroy them. Everything else cascades.
  await prisma.$transaction([
    prisma.generatedDocument.updateMany({ where: { petitionId: id }, data: { petitionId: null } }),
    prisma.petitionSignature.deleteMany({ where: { petitionId: id } }),
    prisma.petition.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
