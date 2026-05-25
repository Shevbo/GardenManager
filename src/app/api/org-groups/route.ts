import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.orgGroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      orgs: {
        include: { org: { select: { id: true, name: true } } },
      },
      _count: { select: { petitions: true } },
    },
  })

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name } = body as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const group = await prisma.orgGroup.create({
    data: { name: name.trim(), createdBy: session.user.id },
  })

  return NextResponse.json(group, { status: 201 })
}
