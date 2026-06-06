import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { canInteractWithPetition } from '@/lib/petition-access'

const LEGAL_DISCLAIMER = `Подписывая данное заявление с подтверждением одноразовым кодом из СМС,
я подтверждаю своё согласие с текстом заявления.
Настоящая простая электронная подпись с верификацией абонентского номера эквивалентна
моей собственноручной подписи на заявлении, которое будет направлено
в государственные органы. Я осознаю юридические последствия данного действия.`

export async function GET() {
  return NextResponse.json({ disclaimer: LEGAL_DISCLAIMER })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { legalConsent } = body as { legalConsent?: boolean }

  if (!legalConsent) {
    return NextResponse.json({ error: 'Необходимо принять условия' }, { status: 400 })
  }

  const petition = await prisma.petition.findUnique({ where: { id } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (petition.status !== 'SIGNING') {
    return NextResponse.json({ error: 'Petition not in SIGNING phase' }, { status: 400 })
  }

  const canInteract = await canInteractWithPetition(session.user.id, id)
  if (!canInteract) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Derive verifiedVia server-side only (never trust client)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  // Signing is SMS-only (ПЭП via verified phone number). No e-mail signing.
  if (!user?.phoneVerified) {
    return NextResponse.json({ error: 'Для подписания необходим подтверждённый номер телефона' }, { status: 403 })
  }

  const via = 'sms'

  const signature = await prisma.petitionSignature.upsert({
    where: { petitionId_userId: { petitionId: id, userId: session.user.id } },
    create: {
      petitionId: id,
      userId: session.user.id,
      verifiedVia: via,
      legalConsent: true,
    },
    update: { signedAt: new Date(), verifiedVia: via, legalConsent: true },
  })

  return NextResponse.json(signature, { status: 201 })
}
