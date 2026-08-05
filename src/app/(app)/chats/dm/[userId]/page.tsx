import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { DmRoom } from './DmRoom'

export const dynamic = 'force-dynamic'

export default async function DmPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const me = session.user.id
  const { userId: peer } = await params

  if (peer === me) redirect('/chats')
  const peerUser = await prisma.user.findUnique({ where: { id: peer }, select: { id: true, name: true, email: true } })
  if (!peerUser) redirect('/chats')

  const [meUser, initialMessages] = await Promise.all([
    prisma.user.findUnique({ where: { id: me }, select: { name: true, email: true } }),
    prisma.directMessage.findMany({
      where: {
        OR: [
          { fromUserId: me, toUserId: peer },
          { fromUserId: peer, toUserId: me },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { id: true, text: true, createdAt: true, fromUserId: true },
    }),
  ])

  // Opening the conversation clears its bell notifications.
  await prisma.notification.updateMany({
    where: { userId: me, type: 'dm', href: `/chats/dm/${peer}`, readAt: null },
    data: { readAt: new Date() },
  })

  const peerName = peerUser.name || peerUser.email || 'Участник'
  const currentUserName = meUser?.name || meUser?.email || 'Вы'

  return (
    <DmRoom
      peerId={peer}
      peerName={peerName}
      currentUserId={me}
      currentUserName={currentUserName}
      initialMessages={initialMessages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  )
}
