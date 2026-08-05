import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePhoneVerified } from '@/lib/permissions'
import prisma from '@/lib/prisma'

async function memberOrForbidden(userId: string, assemblyId: string) {
  const assembly = await prisma.assembly.findUnique({ where: { id: assemblyId }, select: { id: true, orgId: true } })
  if (!assembly) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const membership = await prisma.membership.findFirst({ where: { userId, orgId: assembly.orgId }, select: { id: true } })
  if (!membership) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { assembly }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const g = await memberOrForbidden(session.user.id, id)
  if ('error' in g) return g.error

  const comments = await prisma.assemblyComment.findMany({
    where: { assemblyId: id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: { id: true, text: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gate = await requirePhoneVerified(session.user.id)
  if (gate) return gate

  const { id } = await params
  const g = await memberOrForbidden(session.user.id, id)
  if ('error' in g) return g.error

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { text } = body as { text?: string }
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'text too long' }, { status: 400 })

  const comment = await prisma.assemblyComment.create({
    data: { assemblyId: id, userId: session.user.id, text: text.trim() },
    select: { id: true, text: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json({ comment }, { status: 201 })
}
