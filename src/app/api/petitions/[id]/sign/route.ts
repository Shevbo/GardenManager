import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

const LEGAL_DISCLAIMER = `Подписывая данное заявление с подтверждением через SMS/email,
я подтверждаю своё согласие с текстом заявления.
Настоящая электронная подпись с верификацией канала связи эквивалентна
моей собственноручной подписи на заявлении, которое будет направлено
в государственные органы. Я осознаю юридические последствия данного действия.`

export async function GET() {
  return NextResponse.json({ disclaimer: LEGAL_DISCLAIMER })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { legalConsent, verifiedVia } = body as { legalConsent?: boolean; verifiedVia?: string }

  if (!legalConsent) {
    return NextResponse.json({ error: 'Необходимо принять условия' }, { status: 400 })
  }

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (petition.status !== 'SIGNING') {
    return NextResponse.json({ error: 'Petition not in SIGNING phase' }, { status: 400 })
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  const via = verifiedVia ?? (user?.phoneVerified ? 'sms' : 'email')

  const signature = await prisma.petitionSignature.upsert({
    where: { petitionId_userId: { petitionId: id, userId: session.user.id } },
    create: {
      petitionId: id,
      userId: session.user.id,
      verifiedVia: via,
      legalConsent: true,
    },
    update: { signedAt: new Date() },
  })

  return NextResponse.json(signature, { status: 201 })
}
