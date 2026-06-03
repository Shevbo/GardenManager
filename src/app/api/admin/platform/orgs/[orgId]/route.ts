import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[«»""'']/g, '')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, type, slug } = body as { name?: string; type?: string; slug?: string }

  const data: { name?: string; type?: 'zhk' | 'kooperativ'; slug?: string } = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (type === 'zhk' || type === 'kooperativ') data.type = type
  if (typeof slug === 'string' && slug.trim()) data.slug = slugify(slug) || undefined
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  try {
    const org = await prisma.organization.update({
      where: { id: orgId }, data,
      select: { id: true, name: true, type: true, slug: true },
    })
    return NextResponse.json({ org })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'slug уже занят' }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId } = await params

  const [memberships, buildings, petitions, assemblies] = await Promise.all([
    prisma.membership.count({ where: { orgId } }),
    prisma.building.count({ where: { orgId } }),
    prisma.petition.count({ where: { orgId } }),
    prisma.assembly.count({ where: { orgId } }),
  ])

  const blockers: string[] = []
  if (memberships > 0) blockers.push(`${memberships} участн.`)
  if (buildings > 0) blockers.push(`${buildings} здан.`)
  if (petitions > 0) blockers.push(`${petitions} заявл.`)
  if (assemblies > 0) blockers.push(`${assemblies} собран.`)
  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Сначала удалите связанные: ${blockers.join(', ')}` },
      { status: 409 },
    )
  }

  await prisma.organization.delete({ where: { id: orgId } })
  return NextResponse.json({ ok: true })
}
