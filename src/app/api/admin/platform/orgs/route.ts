import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      slug: true,
      _count: { select: { memberships: true, petitions: true, buildings: true } },
    },
  })

  return NextResponse.json({ orgs })
}

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[«»""'']/g, '')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
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

  const { name, type } = body as { name?: string; type?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (type !== 'zhk' && type !== 'kooperativ') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }

  let slug = slugify(name) || 'org'
  const existing = await prisma.organization.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const org = await prisma.organization.create({
    data: { name: name.trim(), type, slug },
    select: { id: true, name: true, type: true, slug: true },
  })

  return NextResponse.json(org, { status: 201 })
}
