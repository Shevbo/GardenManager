import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateOtp } from '@/lib/sms'
import { sendEmailOtp } from '@/lib/email'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email } = body as { email?: string }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
  }

  const newEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findFirst({
    where: { email: newEmail, id: { not: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Этот email уже привязан к другому аккаунту' }, { status: 409 })
  }

  const identifier = `change-email:${session.user.id}`
  const otp = generateOtp()
  const expires = new Date(Date.now() + OTP_TTL_MS)

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: { identifier, token: otp, expires },
  })

  await sendEmailOtp(newEmail, otp)

  return NextResponse.json({ ok: true })
}
