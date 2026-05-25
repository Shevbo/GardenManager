import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const activity = await prisma.activity.findUnique({ where: { id } })
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { consent } = body as { consent?: boolean }
  if (!consent) {
    return NextResponse.json({ error: 'Необходимо подтвердить согласие' }, { status: 400 })
  }

  const membership = await prisma.activityMembership.upsert({
    where: { activityId_userId: { activityId: id, userId: session.user.id } },
    create: { activityId: id, userId: session.user.id },
    update: {},
  })

  return NextResponse.json(membership, { status: 201 })
}
