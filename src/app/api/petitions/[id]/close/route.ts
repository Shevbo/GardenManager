import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendNotSignedNotification } from '@/lib/email'
import { canTransition } from '@/lib/petition-status'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: { include: { memberships: { include: { user: true } } } },
      signatures: { select: { userId: true } },
    },
  })

  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!canTransition(petition.status as 'DRAFT' | 'DISCUSSION' | 'AI_REVISION' | 'SIGNING' | 'CLOSED' | 'EXPORTED', 'CLOSED')) {
    return NextResponse.json({ error: 'Cannot close petition from current status' }, { status: 400 })
  }

  const signerIds = new Set(petition.signatures.map(s => s.userId))

  const notSigners = petition.org.memberships
    .filter(m => !signerIds.has(m.userId) && m.user.email)
    .map(m => m.user)

  await Promise.allSettled(
    notSigners.map(u => sendNotSignedNotification(u.email!, petition.title))
  )

  const updated = await prisma.petition.update({
    where: { id },
    data: { status: 'CLOSED' },
  })

  return NextResponse.json({
    petition: updated,
    signersCount: signerIds.size,
    notSignersNotified: notSigners.length,
  })
}
