import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, MessageSquare, User } from 'lucide-react'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getUserOrgs } from '@/lib/active-org'
import { Topbar } from '@/components/layout/Topbar'

export const dynamic = 'force-dynamic'

export default async function ChatsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const me = session.user.id

  const [orgs, recent] = await Promise.all([
    getUserOrgs(me),
    prisma.directMessage.findMany({
      where: { OR: [{ fromUserId: me }, { toUserId: me }] },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { fromUserId: true, toUserId: true, text: true, createdAt: true },
    }),
  ])

  // Reduce to one row per peer (latest message wins — list is already desc).
  const peers = new Map<string, { text: string; createdAt: Date }>()
  for (const m of recent) {
    const peer = m.fromUserId === me ? m.toUserId : m.fromUserId
    if (!peers.has(peer)) peers.set(peer, { text: m.text, createdAt: m.createdAt })
  }
  const peerUsers = peers.size
    ? await prisma.user.findMany({ where: { id: { in: [...peers.keys()] } }, select: { id: true, name: true, email: true } })
    : []
  const peerName = (id: string) => {
    const u = peerUsers.find(x => x.id === id)
    return u?.name || u?.email || 'Участник'
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar title="Чаты" subtitle="Чаты организаций и личные сообщения" />
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl">
        <h2 className="text-xs uppercase tracking-wide text-ink/50 mb-3">Чаты организаций</h2>
        <div className="space-y-2 mb-8">
          {orgs.length === 0 && <p className="text-sm text-ink/50">Вы не состоите в организациях.</p>}
          {orgs.map(o => (
            <Link key={o.id} href={`/chats/${o.id}`}
              className="flex items-center gap-3 bg-white border border-border rounded-2xl p-4 hover:border-forest transition-colors">
              <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-forest" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{o.name}</p>
                <p className="text-xs text-ink/50">Общий чат организации</p>
              </div>
              <MessageSquare size={16} className="text-ink/30" />
            </Link>
          ))}
        </div>

        <h2 className="text-xs uppercase tracking-wide text-ink/50 mb-3">Личные сообщения</h2>
        <div className="space-y-2">
          {peers.size === 0 && (
            <p className="text-sm text-ink/50">
              Личных диалогов пока нет. Начните — нажмите на имя участника на главной или в реестре.
            </p>
          )}
          {[...peers.entries()].map(([id, last]) => (
            <Link key={id} href={`/chats/dm/${id}`}
              className="flex items-center gap-3 bg-white border border-border rounded-2xl p-4 hover:border-forest transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
                <User size={18} className="text-amber" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{peerName(id)}</p>
                <p className="text-xs text-ink/50 truncate">{last.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
