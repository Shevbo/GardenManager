import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await isPlatformAdmin(session.user.id))) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { userId: session.user.id }
}

export async function GET() {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const items = await prisma.documentTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin()
  if ('error' in a) return a.error
  const b = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!b) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const { category, title, description, scope, layoutKey, bodyTemplate, variables, isActive } = b
  if (!title || !scope || !layoutKey) return NextResponse.json({ error: 'title/scope/layoutKey required' }, { status: 400 })
  const created = await prisma.documentTemplate.create({
    data: {
      category: String(category ?? 'Без категории'),
      title: String(title),
      description: description ? String(description) : null,
      scope: String(scope),
      layoutKey: String(layoutKey),
      bodyTemplate: bodyTemplate ? String(bodyTemplate) : null,
      variables: (variables ?? []) as object,
      isActive: isActive === undefined ? true : Boolean(isActive),
    },
  })
  return NextResponse.json(created, { status: 201 })
}
