import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'
import { missingRequired } from '@/lib/templates'
import type { TemplateVariable } from '@/lib/pdf/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await requirePhoneVerified(session.user.id); if (gate) return gate
  const { id } = await params
  const b = await req.json().catch(() => ({})) as { legalConsent?: boolean }
  if (!b.legalConsent) return NextResponse.json({ error: 'Необходимо принять условия' }, { status: 400 })
  const doc = await prisma.generatedDocument.findUnique({ where: { id }, include: { template: true } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const variables = (doc.template.variables as unknown as TemplateVariable[]) ?? []
  const missing = missingRequired(variables, (doc.fieldValues as Record<string, string>) ?? {})
  if (missing.length) return NextResponse.json({ error: 'Заполните обязательные поля', missing }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.phoneVerified && !user?.emailVerified) return NextResponse.json({ error: 'Необходима верификация канала' }, { status: 403 })
  const via = user.phoneVerified ? 'sms' : 'email'
  const signed = await prisma.generatedDocument.update({ where: { id }, data: { status: 'signed', signedAt: new Date(), verifiedVia: via } })
  return NextResponse.json(signed)
}
