import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { validateInvite } from '@/lib/invite'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params

  const invite = await prisma.inviteLink.findUnique({
    where: { token },
    include: { apartment: { include: { building: { select: { orgId: true } } } } },
  })

  const check = validateInvite(invite)
  if (!check.valid) {
    const status = check.reason === 'not_found' ? 404 : 410
    return NextResponse.json({ error: check.reason }, { status })
  }

  // invite is non-null here
  const validInvite = invite!

  // Already a member for this specific apartment? (owners may hold several)
  const existing = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: validInvite.orgId, apartmentId: validInvite.apartmentId ?? null },
  })

  const [membership] = await prisma.$transaction([
    existing
      ? prisma.membership.update({
          where: { id: existing.id },
          data: { apartmentId: validInvite.apartmentId || existing.apartmentId },
        })
      : prisma.membership.create({
          data: {
            userId: session.user.id,
            orgId: validInvite.orgId,
            role: 'owner',
            apartmentId: validInvite.apartmentId || null,
          },
        }),
    prisma.inviteLink.update({
      where: { token },
      data: { usedBy: session.user.id, usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ membership })
}
