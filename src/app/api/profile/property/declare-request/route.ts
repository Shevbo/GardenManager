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
  const { propertyId } = body as { propertyId?: string }
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId required' }, { status: 400 })
  }

  const item = await prisma.propertyOwnership.findUnique({ where: { id: propertyId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (item.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, phoneVerified: true },
  })
  if (!user?.phone || !user.phoneVerified) {
    return NextResponse.json({ error: 'phone_not_verified' }, { status: 400 })
  }

  const identifier = `property:${session.user.id}:${propertyId}`
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
    console.warn('[property:sms-send-failed]', (e as Error).message)
  }

  return NextResponse.json({ ok: true, smsSent })
}
