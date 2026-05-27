import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canTransition, PetitionStatus } from '@/lib/petition-status'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      materials: true,
      _count: { select: { signatures: true, comments: true } },
    },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(petition)
}

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

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify membership in the petition's org
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status, finalText, recipient, discussionDeadline, signingDeadline, title, draftText } =
    body as {
      status?: string; finalText?: string; recipient?: string
      discussionDeadline?: string; signingDeadline?: string
      title?: string; draftText?: string
    }

  if (status) {
    if (!canTransition(petition.status as PetitionStatus, status as PetitionStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${petition.status} to ${status}` },
        { status: 400 }
      )
    }
  }

  if ((title !== undefined || draftText !== undefined) && petition.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'title and draftText editable only in DRAFT status' },
      { status: 400 }
    )
  }

  const updated = await prisma.petition.update({
    where: { id },
    data: {
      ...(status && { status: status as PetitionStatus }),
      ...(title !== undefined && { title: title.trim() }),
      ...(draftText !== undefined && { draftText: draftText.trim() }),
      ...(finalText !== undefined && { finalText }),
      ...(recipient !== undefined && { recipient: recipient?.trim() || null }),
      ...(discussionDeadline && { discussionDeadline: new Date(discussionDeadline) }),
      ...(signingDeadline && { signingDeadline: new Date(signingDeadline) }),
    },
  })

  return NextResponse.json(updated)
}
