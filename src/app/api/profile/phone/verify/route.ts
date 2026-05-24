import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const PHONE_REGEX = /^\+7\d{10}$/

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, otp } = body as { phone?: string; otp?: string }

  if (!phone || !PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { error: 'Неверный формат номера. Ожидается: +7XXXXXXXXXX' },
      { status: 400 }
    )
  }
  if (!otp) {
    return NextResponse.json({ error: 'otp required' }, { status: 400 })
  }

  const token = await prisma.verificationToken.findFirst({
    where: { identifier: phone, token: otp, expires: { gt: new Date() } },
  })
  if (!token) {
    return NextResponse.json({ error: 'Неверный или истёкший код' }, { status: 400 })
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: phone } })

  // Check phone uniqueness: reject if another user already has this phone
  const existing = await prisma.user.findFirst({
    where: { phone, id: { not: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Этот номер уже привязан к другому аккаунту' }, { status: 409 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone, phoneVerified: new Date() },
  })

  return NextResponse.json({ ok: true })
}
