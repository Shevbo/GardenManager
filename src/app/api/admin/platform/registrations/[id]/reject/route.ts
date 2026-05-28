import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isPlatformAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { reason } = body as { reason?: string }

  const pending = await prisma.pendingRegistration.findUnique({ where: { id } })
  if (!pending) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (pending.status !== 'PENDING') {
    return NextResponse.json({ error: 'already_processed' }, { status: 400 })
  }

  await prisma.pendingRegistration.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      rejectReason: reason?.trim() || null,
    },
  })

  return NextResponse.json({ ok: true })
}
