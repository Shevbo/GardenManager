import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateOtp, sendSms } from '@/lib/sms'

const OTP_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { membershipId } = body as { membershipId?: string }
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId required' }, { status: 400 })
  }

  const m = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (m.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, phoneVerified: true },
  })
  if (!user?.phone || !user.phoneVerified) {
    return NextResponse.json({ error: 'phone_not_verified' }, { status: 400 })
  }

  const identifier = `ownership:${session.user.id}:${membershipId}`
  const otp = generateOtp()
  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: { identifier, token: otp, expires: new Date(Date.now() + OTP_TTL_MS) },
  })

  let smsSent = true
  try {
    await sendSms(user.phone, `Garden Manager: код подтверждения декларации ${otp}. Действителен 10 минут.`)
  } catch (e) {
    smsSent = false
    console.warn('[ownership:sms-send-failed]', (e as Error).message)
  }

  return NextResponse.json({ ok: true, smsSent })
}
