import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { applyTemplate, missingRequired, type FieldValues } from '@/lib/templates'
import type { TemplateVariable } from '@/lib/pdf/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await params
  const templates = await prisma.documentTemplate.findMany({ where: { scope: 'collective', isActive: true } })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true, email: true } })
  return NextResponse.json({ templates, profile: user })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const b = await req.json().catch(() => null) as { templateId?: string; values?: FieldValues } | null
  if (!b?.templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  const template = await prisma.documentTemplate.findUnique({ where: { id: b.templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const variables = (template.variables as unknown as TemplateVariable[]) ?? []
  const values: FieldValues = { ...(b.values ?? {}) }
  const missing = missingRequired(variables, values)
  if (missing.length) return NextResponse.json({ error: 'Заполните обязательные поля', missing }, { status: 400 })

  const draftText = applyTemplate(template.bodyTemplate ?? '', values)
  const updated = await prisma.petition.update({
    where: { id },
    data: { templateId: template.id, fieldValues: values, draftText, recipient: values.recipient ?? undefined },
  })
  return NextResponse.json(updated)
}
