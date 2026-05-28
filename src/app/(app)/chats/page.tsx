import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getActiveOrgId } from '@/lib/active-org'
import Link from 'next/link'
import { MessageSquare, Users } from 'lucide-react'

function formatTime(d: Date | string): string {
  const date = new Date(d)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default async function ChatsListPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const activeOrgId = await getActiveOrgId(session.user.id)
  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
      ...(activeOrgId ? { orgId: activeOrgId } : {}),
    },
    select: {
      org: {
        select: {
          id: true, name: true, slug: true,
          _count: { select: { memberships: true } },
        },
      },
    },
  })

  // Fetch last message for each org
  const orgIds = memberships.map(m => m.org.id)
  const lastMessages = await Promise.all(
    orgIds.map(orgId =>
      prisma.chatMessage.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      })
    )
  )

  const chats = memberships.map((m, i) => ({
    org: m.org,
    lastMessage: lastMessages[i],
  })).sort((a, b) => {
    const ta = a.lastMessage?.createdAt.getTime() ?? 0
    const tb = b.lastMessage?.createdAt.getTime() ?? 0
    return tb - ta
  })

  return (
    <div className="p-8 max-w-3xl overflow-y-auto flex-1">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Чаты</h1>
      <p className="text-ink/50 text-sm mb-6">Общение участников каждой организации</p>

      {chats.length === 0 ? (
        <div className="text-center py-12 text-ink/50">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
          <p>Вы пока не состоите в организациях</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map(({ org, lastMessage }) => (
            <Link key={org.id} href={`/chats/${org.id}`}
              className="block bg-white border border-border rounded-2xl p-4 hover:border-forest/30 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
                  <MessageSquare size={18} className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-ink truncate">{org.name}</p>
                    {lastMessage && (
                      <span className="text-xs text-ink/40 shrink-0">
                        {formatTime(lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {lastMessage ? (
                    <p className="text-sm text-ink/60 truncate">
                      <span className="font-medium">{lastMessage.user.name ?? 'Кто-то'}:</span>{' '}
                      {lastMessage.text}
                    </p>
                  ) : (
                    <p className="text-sm text-ink/40 italic">Сообщений пока нет</p>
                  )}
                  <p className="text-xs text-ink/40 mt-1 flex items-center gap-1">
                    <Users size={11} />
                    {org._count.memberships} участников
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
