import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, otp } = body as { email?: string; otp?: string }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 })
  }
  if (!otp?.trim()) {
    return NextResponse.json({ error: 'otp required' }, { status: 400 })
  }

  const newEmail = email.trim().toLowerCase()
  const identifier = `change-email:${session.user.id}`

  const token = await prisma.verificationToken.findFirst({
    where: { identifier, token: otp.trim(), expires: { gt: new Date() } },
  })
  if (!token) {
    return NextResponse.json({ error: 'Неверный или истёкший код' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { email: newEmail, id: { not: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Этот email уже привязан к другому аккаунту' }, { status: 409 })
  }

  await prisma.verificationToken.deleteMany({ where: { identifier } })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: newEmail },
  })

  return NextResponse.json({ ok: true })
}
