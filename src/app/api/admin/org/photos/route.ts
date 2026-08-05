import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/permissions'
import { extForMime, orgPhotoRelPath, writePhoto, deletePhotoFile } from '@/lib/org-storage'

const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400 })
  const orgId = form.get('orgId')
  const file = form.get('file')
  if (typeof orgId !== 'string' || !orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })

  if (!(await isOrgAdmin(session.user.id, orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ext = extForMime(file.type)
  if (!ext) return NextResponse.json({ error: 'Только JPEG, PNG или WebP' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: 'Файл 0–10 МБ' }, { status: 400 })

  const id = randomUUID()
  const relPath = orgPhotoRelPath(orgId, id, ext)
  const bytes = Buffer.from(await file.arrayBuffer())
  await writePhoto(relPath, bytes)

  const existing = await prisma.orgPhoto.count({ where: { orgId } })
  const photo = await prisma.orgPhoto.create({
    data: { id, orgId, path: relPath, mime: file.type, isCover: existing === 0, sortOrder: existing },
    select: { id: true, isCover: true, sortOrder: true },
  })
  return NextResponse.json({ photo }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { photoId } = body as { photoId?: string }
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

  const photo = await prisma.orgPhoto.findUnique({ where: { id: photoId }, select: { id: true, orgId: true, path: true, isCover: true } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await isOrgAdmin(session.user.id, photo.orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.orgPhoto.delete({ where: { id: photoId } })
  await deletePhotoFile(photo.path)

  // If we removed the cover, promote the next photo.
  if (photo.isCover) {
    const next = await prisma.orgPhoto.findFirst({ where: { orgId: photo.orgId }, orderBy: { sortOrder: 'asc' }, select: { id: true } })
    if (next) await prisma.orgPhoto.update({ where: { id: next.id }, data: { isCover: true } })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { photoId } = body as { photoId?: string }
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

  const photo = await prisma.orgPhoto.findUnique({ where: { id: photoId }, select: { id: true, orgId: true } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await isOrgAdmin(session.user.id, photo.orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.$transaction([
    prisma.orgPhoto.updateMany({ where: { orgId: photo.orgId, isCover: true }, data: { isCover: false } }),
    prisma.orgPhoto.update({ where: { id: photoId }, data: { isCover: true } }),
  ])
  return NextResponse.json({ ok: true })
}
