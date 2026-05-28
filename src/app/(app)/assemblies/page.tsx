import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getActiveOrgId, getUserOrgIds } from '@/lib/active-org'
import Link from 'next/link'
import { Plus, Vote as VoteIcon, Calendar } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  ANNOUNCED: 'bg-amber/10 text-amber-700',
  VOTING:    'bg-forest/10 text-forest font-semibold',
  CLOSED:    'bg-blue-50 text-blue-700',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик',
  ANNOUNCED: 'Объявлено',
  VOTING: 'Голосование',
  CLOSED: 'Закрыто',
}
const TYPE_LABEL: Record<string, string> = {
  online: 'Очное / онлайн',
  async_collect: 'Заочное',
}
const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AssembliesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    select: { orgId: true, role: true },
  })
  const isAdmin = memberships.some(m => ADMIN_ROLES.includes(m.role))
  const activeOrgId = await getActiveOrgId(session.user.id)
  const orgIds = activeOrgId ? [activeOrgId] : memberships.map(m => m.orgId)

  const assemblies = orgIds.length === 0 ? [] : await prisma.assembly.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      org: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  })

  return (
    <div className="p-8 max-w-4xl overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink mb-1">Собрания</h1>
          <p className="text-ink/50 text-sm">
            {assemblies.filter(a => a.status !== 'CLOSED').length} активных
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin/assemblies/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium">
            <Plus size={16} />
            Созвать ОСС
          </Link>
        )}
      </div>

      {assemblies.length === 0 ? (
        <div className="text-center py-12 text-ink/50">
          <VoteIcon size={32} className="mx-auto mb-3 opacity-50" />
          <p>Собраний ещё нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assemblies.map(a => (
            <Link key={a.id} href={`/assemblies/${a.id}`}
              className="block bg-white border border-border rounded-2xl p-5 hover:border-forest/30 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${STATUS_STYLE[a.status] ?? STATUS_STYLE.DRAFT}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    <span className="text-xs text-ink/50">{TYPE_LABEL[a.type]}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-ink mb-1 truncate">{a.title}</h3>
                  <p className="text-xs text-ink/50 flex items-center gap-3 flex-wrap">
                    <span>{a.org.name}</span>
                    <span>·</span>
                    <span>{a._count.questions} {a._count.questions === 1 ? 'вопрос' : 'вопросов'}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDate(a.startsAt)} – {formatDate(a.endsAt)}
                    </span>
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
