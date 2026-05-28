import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getActiveOrgId, getUserOrgIds } from '@/lib/active-org'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик', DISCUSSION: 'Обсуждение', AI_REVISION: 'AI Ревизия',
  SIGNING: 'Подписание', CLOSED: 'Закрыто', EXPORTED: 'Готово',
}

const NEXT_STEP: Record<string, string> = {
  DRAFT: 'edit', DISCUSSION: 'discussion', AI_REVISION: 'revision',
  SIGNING: 'signing', CLOSED: 'export', EXPORTED: 'export',
}

export default async function AdminPetitionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const activeOrgId = await getActiveOrgId(session.user.id)
  const orgIds = activeOrgId ? [activeOrgId] : await getUserOrgIds(session.user.id)
  const petitions = orgIds.length === 0 ? [] : await prisma.petition.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { signatures: true, comments: true } } },
  })

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Заявления</h1>
        <Link href="/admin/petitions/new">
          <Button>+ Новое заявление</Button>
        </Link>
      </div>

      <div className="space-y-3">
        {petitions.map(p => (
          <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between gap-4">
            <div>
              <Link href={`/admin/petitions/${p.id}/${NEXT_STEP[p.status] ?? 'discussion'}`} className="font-medium hover:underline">
                {p.title}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {p._count.signatures} подписей · {p._count.comments} комментариев
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium tracking-wide uppercase bg-[#F0EDE6] text-[#6B6B63] rounded">
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
              <Link href={`/admin/petitions/${p.id}/${NEXT_STEP[p.status] ?? 'discussion'}`}>
                <Button size="sm" variant="secondary">→</Button>
              </Link>
            </div>
          </div>
        ))}
        {petitions.length === 0 && (
          <p className="text-gray-500 text-center py-12">Заявлений пока нет</p>
        )}
      </div>
    </div>
  )
}
