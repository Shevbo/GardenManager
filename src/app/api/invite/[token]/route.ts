import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateInvite } from '@/lib/invite'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const invite = await prisma.inviteLink.findUnique({
    where: { token },
    include: {
      org: { select: { id: true, name: true, slug: true } },
      apartment: { include: { building: { select: { address: true } } } },
    },
  })

  const check = validateInvite(invite)
  if (!check.valid) {
    const status = check.reason === 'not_found' ? 404 : 410
    return NextResponse.json({ error: check.reason }, { status })
  }

  // invite is non-null here (validateInvite returns invalid for null)
  const validInvite = invite!

  return NextResponse.json({
    org: validInvite.org,
    apartment: validInvite.apartment
      ? { number: validInvite.apartment.number, building: validInvite.apartment.building.address }
      : null,
    expiresAt: validInvite.expiresAt,
  })
}
