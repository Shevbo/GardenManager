import { NextRequest, NextResponse } from 'next/server'
import { sendSms, generateOtp } from '@/lib/sms'
import prisma from '@/lib/prisma'

const PHONE_REGEX = /^\+7\d{10}$/
const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone } = body as { phone?: string }

  if (!phone || !PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { error: 'Неверный формат номера. Ожидается: +7XXXXXXXXXX' },
      { status: 400 }
    )
  }

  const otp = generateOtp()
  const expires = new Date(Date.now() + OTP_TTL_MS)

  // Delete any existing OTP for this phone before creating new one
  await prisma.verificationToken.deleteMany({
    where: { identifier: phone },
  })

  await prisma.verificationToken.create({
    data: { identifier: phone, token: otp, expires },
  })

  await sendSms(phone, `Ваш код Garden Manager: ${otp}. Действителен 10 минут.`)

  return NextResponse.json({ ok: true })
}
