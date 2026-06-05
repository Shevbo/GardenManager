import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { profileVariableValues, type FieldValues } from '@/lib/templates'
import type { TemplateVariable } from '@/lib/pdf/types'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.generatedDocument.findMany({
    where: { userId: session.user.id },
    include: { template: { select: { title: true, layoutKey: true, scope: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => null) as { templateId?: string; petitionId?: string } | null
  if (!b?.templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  const template = await prisma.documentTemplate.findUnique({ where: { id: b.templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true, email: true, address: true } })
  const variables = (template.variables as unknown as TemplateVariable[]) ?? []
  const prefill: FieldValues = profileVariableValues(variables, user ?? {})
  const doc = await prisma.generatedDocument.create({
    data: {
      userId: session.user.id, templateId: template.id, petitionId: b.petitionId ?? null,
      title: template.title, fieldValues: prefill, status: 'draft',
    },
  })
  return NextResponse.json(doc, { status: 201 })
}
