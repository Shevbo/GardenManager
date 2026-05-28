import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { membershipId, otp, declaredText, areaSqm, sharePercent } = body as {
    membershipId?: string; otp?: string; declaredText?: string
    areaSqm?: number; sharePercent?: number
  }

  if (!membershipId || !otp?.trim() || !declaredText?.trim()) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const m = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (m.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const identifier = `ownership:${session.user.id}:${membershipId}`
  const token = await prisma.verificationToken.findFirst({
    where: { identifier, token: otp.trim(), expires: { gt: new Date() } },
  })
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })
  }

  const [declaration] = await prisma.$transaction([
    prisma.ownershipDeclaration.create({
      data: {
        userId: session.user.id,
        membershipId,
        areaSqm: areaSqm ?? null,
        sharePercent: sharePercent ?? null,
        declaredText: declaredText.trim(),
        smsToken: token.token,
      },
    }),
    prisma.membership.update({
      where: { id: membershipId },
      data: {
        ...(areaSqm !== undefined && { areaSqm }),
      },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ])

  return NextResponse.json({ ok: true, declarationId: declaration.id }, { status: 201 })
}
