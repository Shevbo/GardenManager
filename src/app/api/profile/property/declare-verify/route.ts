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
  const { propertyId, otp, declaredText } = body as {
    propertyId?: string
    otp?: string
    declaredText?: string
  }

  if (!propertyId || !otp?.trim() || !declaredText?.trim()) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const item = await prisma.propertyOwnership.findUnique({ where: { id: propertyId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (item.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const identifier = `property:${session.user.id}:${propertyId}`
  const token = await prisma.verificationToken.findFirst({
    where: { identifier, token: otp.trim(), expires: { gt: new Date() } },
  })
  if (!token) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.propertyOwnership.update({
      where: { id: propertyId },
      data: { signedAt: new Date(), declaredText: declaredText.trim() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ])

  return NextResponse.json({ ok: true })
}
