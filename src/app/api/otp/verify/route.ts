import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, otp } = body as { phone?: string; otp?: string }

  if (!phone || !otp) {
    return NextResponse.json({ error: 'phone and otp required' }, { status: 400 })
  }

  const token = await prisma.verificationToken.findFirst({
    where: {
      identifier: phone,
      token: otp,
      expires: { gt: new Date() },
    },
  })

  if (!token) {
    return NextResponse.json(
      { error: 'Неверный или истёкший код' },
      { status: 400 }
    )
  }

  // Delete used token (single-use)
  await prisma.verificationToken.deleteMany({
    where: { identifier: phone },
  })

  // Find or create user
  let user = await prisma.user.findFirst({ where: { phone } })
  if (!user) {
    user = await prisma.user.create({
      data: { phone, phoneVerified: new Date() },
    })
  } else if (!user.phoneVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: new Date() },
    })
  }

  return NextResponse.json({ ok: true, userId: user.id })
}
