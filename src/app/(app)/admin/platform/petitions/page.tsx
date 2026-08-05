import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'
import { ArrowLeft } from 'lucide-react'
import { AdminPetitionRow } from './AdminPetitionRow'

export const dynamic = 'force-dynamic'

export default async function PetitionRepositoryPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard')

  const { org: orgFilter } = await searchParams

  const [petitions, filterOrg] = await Promise.all([
    prisma.petition.findMany({
      where: orgFilter ? { orgId: orgFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        org: { select: { name: true } },
        _count: { select: { signatures: true, comments: true } },
      },
    }),
    orgFilter
      ? prisma.organization.findUnique({ where: { id: orgFilter }, select: { name: true } })
      : Promise.resolve(null),
  ])

  const rows = petitions.map(p => ({
    id: p.id,
    title: p.title,
    status: p.status,
    orgName: p.org?.name ?? '—',
    signatures: p._count.signatures,
    comments: p._count.comments,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 max-w-5xl mx-auto overflow-y-auto flex-1">
      <Link href="/admin/platform" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4">
        <ArrowLeft size={15} /> Управление
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Репозиторий заявлений</h1>
      <p className="text-ink/50 text-sm mb-6">
        Все заявления всех организаций. Смена статуса по workflow, полная правка и удаление — права суперадмина.
      </p>

      {orgFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-amber/10 border border-amber/30 rounded-xl text-sm">
          <span className="text-ink">
            Фильтр по организации: <strong>{filterOrg?.name ?? orgFilter}</strong> — удалите эти заявления, чтобы удалить организацию.
          </span>
          <Link href="/admin/platform/petitions" className="text-forest hover:underline shrink-0">Показать все</Link>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map(r => <AdminPetitionRow key={r.id} petition={r} />)}
        {rows.length === 0 && (
          <p className="text-ink/50 text-center py-12">
            {orgFilter ? 'У этой организации нет заявлений.' : 'Заявлений пока нет.'}
          </p>
        )}
      </div>
    </div>
  )
}
