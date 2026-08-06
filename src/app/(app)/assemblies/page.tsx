import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Vote, Calendar } from 'lucide-react'
import { getActiveOrgId } from '@/lib/active-org'
import { canManageAssemblies } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Черновик', ANNOUNCED: 'Объявлено — согласование', VOTING: 'Идёт голосование', CLOSED: 'Закрыто',
}
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ANNOUNCED: 'bg-amber/15 text-amber-700',
  VOTING: 'bg-forest/10 text-forest',
  CLOSED: 'bg-blue-50 text-blue-700',
}

export default async function AssembliesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Scope to the ACTIVE group only — never show assemblies of other groups.
  const activeOrgId = await getActiveOrgId(session.user.id)
  // Кто может созвать ОСС — по правам в организации (админ платформы, орг-админ,
  // должности правления), а НЕ по Membership.role: собственник может быть
  // председателем/админом, и раньше кнопка от него пряталась.
  const isAdmin = activeOrgId ? await canManageAssemblies(session.user.id, activeOrgId) : false

  const assemblies = !activeOrgId ? [] : await prisma.assembly.findMany({
    where: { orgId: activeOrgId },
    orderBy: { createdAt: 'desc' },
    include: { org: { select: { name: true } }, _count: { select: { questions: true } } },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">Собрания</h1>
        {isAdmin && (
          <Link href="/admin/assemblies/new"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-forest hover:bg-forest-mid px-4 py-2 rounded-xl transition-colors">
            <Plus size={16} /> Создать собрание
          </Link>
        )}
      </div>
      <p className="text-ink/50 text-sm mb-6">
        Общие собрания собственников: повестка, согласование, голосование и итоговый протокол с реестром подписей.
      </p>

      <div className="space-y-2.5">
        {assemblies.map(a => (
          <Link key={a.id} href={`/assemblies/${a.id}`}
            className="block bg-white border border-border rounded-2xl p-4 hover:border-forest/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{a.title}</p>
                <p className="text-xs text-ink/50 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1"><Vote size={13} /> {a._count.questions} вопрос(ов)</span>
                  <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(a.startsAt).toLocaleDateString('ru-RU')}–{new Date(a.endsAt).toLocaleDateString('ru-RU')}</span>
                  <span>{a.org.name}</span>
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${STATUS_STYLE[a.status]}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
          </Link>
        ))}
        {assemblies.length === 0 && (
          <div className="text-center py-16 text-ink/50">
            <Vote size={32} className="mx-auto mb-3 opacity-40" />
            <p>Собраний пока нет.</p>
            {isAdmin && <p className="text-sm mt-1">Нажмите «Создать собрание», чтобы сверстать повестку.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
