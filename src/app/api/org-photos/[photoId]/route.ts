import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { readPhoto } from '@/lib/org-storage'

// Serve an org photo file to any authenticated user (org photos are shown on
// members' home headers). Read from disk and stream with its stored mime.
export async function GET(_req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId } = await params
  const photo = await prisma.orgPhoto.findUnique({ where: { id: photoId }, select: { path: true, mime: true } })
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const bytes = await readPhoto(photo.path)
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': photo.mime,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
