import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: {
      org: {
        select: {
          id: true, name: true, slug: true,
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              text: true, createdAt: true,
              user: { select: { name: true } },
            },
          },
          _count: { select: { memberships: true } },
        },
      },
    },
  })

  const chats = memberships.map(m => ({
    orgId: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    members: m.org._count.memberships,
    lastMessage: m.org.chatMessages[0] ?? null,
  }))

  return NextResponse.json({ chats })
}
