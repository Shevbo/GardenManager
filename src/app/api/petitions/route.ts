import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const petitions = await prisma.petition.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { signatures: true, comments: true } },
    },
  })

  return NextResponse.json(petitions)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orgId, title, recipient, draftText, discussionDeadline, signingDeadline, materials, orgGroupId, activityId } =
    body as {
      orgId?: string; title?: string; recipient?: string; draftText?: string
      discussionDeadline?: string; signingDeadline?: string
      materials?: Array<{ key: string; name: string; mimeType: string }>
      orgGroupId?: string; activityId?: string
    }

  if (!orgId || !title?.trim() || !draftText?.trim()) {
    return NextResponse.json(
      { error: 'orgId, title, draftText required' },
      { status: 400 }
    )
  }

  if (orgGroupId && activityId) {
    return NextResponse.json(
      { error: 'orgGroupId and activityId are mutually exclusive' },
      { status: 400 }
    )
  }

  // Verify membership and role (org_admin or council_member can create)
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const petition = await prisma.petition.create({
    data: {
      orgId,
      title: title.trim(),
      recipient: recipient?.trim() || null,
      draftText: draftText.trim(),
      createdBy: session.user.id,
      discussionDeadline: discussionDeadline ? new Date(discussionDeadline) : null,
      signingDeadline: signingDeadline ? new Date(signingDeadline) : null,
      orgGroupId: orgGroupId || null,
      activityId: activityId || null,
      materials: materials?.length
        ? {
            create: materials.map((m) => ({
              url: m.key,
              name: m.name,
              mimeType: m.mimeType,
            })),
          }
        : undefined,
    },
    include: { materials: true },
  })

  return NextResponse.json(petition, { status: 201 })
}
