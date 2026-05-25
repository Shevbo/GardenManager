import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canInteractWithPetition } from '@/lib/petition-access'

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

  // User must have at least one verified channel
  if (!user?.phoneVerified && !user?.emailVerified) {
    return NextResponse.json({ error: 'Необходима верификация канала связи' }, { status: 403 })
  }

  const via = user.phoneVerified ? 'sms' : 'email'

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
