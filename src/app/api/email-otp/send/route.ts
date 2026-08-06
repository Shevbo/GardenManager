import { NextRequest, NextResponse } from 'next/server'
import { generateOtp } from '@/lib/sms'
import { sendEmailOtp } from '@/lib/email'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email } = body as { email?: string }
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const otp = generateOtp()
  const expires = new Date(Date.now() + OTP_TTL_MS)

  await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } })
  await prisma.verificationToken.create({
    data: { identifier: normalizedEmail, token: otp, expires },
  })

  try {
    await sendEmailOtp(normalizedEmail, otp)
  } catch (e) {
    // Сбой почты — не «Сетевая ошибка», а честный ответ; сигнал уже ушёл из sendEmail.
    console.error(`[email-otp] send failed: ${(e as Error).message}`)
    return NextResponse.json(
      { error: 'Не удалось отправить письмо — почтовый сервис временно недоступен. Попробуйте ещё раз через пару минут.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true })
}
