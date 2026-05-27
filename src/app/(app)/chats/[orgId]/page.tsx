import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ChatRoom } from './ChatRoom'

export default async function ChatRoomPage({ params }: { params: Promise<{ orgId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { orgId } = await params

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, _count: { select: { memberships: true } } },
  })
  if (!org) notFound()

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId },
  })
  if (!membership) redirect('/chats')

  const initialMessages = await prisma.chatMessage.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return <ChatRoom
    orgId={orgId}
    orgName={org.name}
    memberCount={org._count.memberships}
    currentUserId={session.user.id}
    initialMessages={initialMessages.map(m => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      user: m.user,
    }))}
  />
}
