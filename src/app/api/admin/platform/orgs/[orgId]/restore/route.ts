import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function POST(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId } = await params
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, slug: true, deletedAt: true } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!org.deletedAt) return NextResponse.json({ ok: true }) // already active

  // Restore the original slug (strip the __del_ suffix), avoiding a collision
  // with any active org that took it in the meantime.
  let slug = org.slug.replace(/__del_[a-z0-9]+$/i, '')
  const clash = await prisma.organization.findFirst({ where: { slug, deletedAt: null, NOT: { id: orgId } }, select: { id: true } })
  if (clash) slug = `${slug}-${Date.now().toString(36)}`

  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } })
  await prisma.$transaction([
    prisma.organization.update({ where: { id: orgId }, data: { deletedAt: null, slug } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorName: actor?.name || actor?.email || null,
        action: 'org.restore',
        entity: 'Organization',
        entityId: orgId,
        snapshot: { slug },
      },
    }),
  ])
  return NextResponse.json({ ok: true })
}
