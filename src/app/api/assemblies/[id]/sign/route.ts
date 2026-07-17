import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

const LEGAL_DISCLAIMER = `Подписывая протокол общего собрания подтверждением одноразовым кодом из СМС,
я подтверждаю своё участие в собрании и голосовании. Настоящая простая электронная подпись
с верификацией абонентского номера эквивалентна моей собственноручной подписи в протоколе собрания.`

export async function GET() {
  return NextResponse.json({ disclaimer: LEGAL_DISCLAIMER })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gateRes = await requirePhoneVerified(session.user.id)
  if (gateRes) return gateRes

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { legalConsent } = body as { legalConsent?: boolean }
  if (!legalConsent) {
    return NextResponse.json({ error: 'Необходимо принять условия' }, { status: 400 })
  }

  const assembly = await prisma.assembly.findUnique({ where: { id }, select: { id: true, orgId: true, status: true } })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (assembly.status !== 'VOTING' && assembly.status !== 'CLOSED') {
    return NextResponse.json({ error: 'Подписание доступно во время голосования или после закрытия' }, { status: 400 })
  }

  // Only owners of the assembly's org may sign (their ballot / the protocol).
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
    select: { isOwner: true },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!membership.isOwner) {
    return NextResponse.json({ error: 'Подписывать могут только собственники' }, { status: 403 })
  }

  // Signing is SMS-only (ПЭП via verified phone). verifiedVia derived server-side.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phoneVerified: true } })
  if (!user?.phoneVerified) {
    return NextResponse.json({ error: 'Для подписания необходим подтверждённый номер телефона' }, { status: 403 })
  }

  const signature = await prisma.assemblySignature.upsert({
    where: { assemblyId_userId: { assemblyId: id, userId: session.user.id } },
    create: { assemblyId: id, userId: session.user.id, verifiedVia: 'sms', legalConsent: true },
    update: { signedAt: new Date(), verifiedVia: 'sms', legalConsent: true },
  })

  return NextResponse.json(signature, { status: 201 })
}
