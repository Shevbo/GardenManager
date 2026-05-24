import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function OrgPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, role: { in: ['org_admin', 'platform_admin'] } },
    include: { org: true },
  })
  if (!membership) redirect('/dashboard')

  const { org } = membership

  const [buildingCount, memberCount] = await Promise.all([
    prisma.building.count({ where: { orgId: org.id } }),
    prisma.membership.count({ where: { orgId: org.id } }),
  ])

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Управление организацией</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-3xl font-bold text-emerald-600">{buildingCount}</div>
          <div className="text-sm text-gray-600 mt-1">Домов</div>
          <Link href="/admin/org/buildings" className="mt-3 block">
            <Button variant="secondary" className="w-full text-sm">Управлять домами</Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-3xl font-bold text-emerald-600">{memberCount}</div>
          <div className="text-sm text-gray-600 mt-1">Участников</div>
          <Link href="/admin/org/members" className="mt-3 block">
            <Button variant="secondary" className="w-full text-sm">Список участников</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-medium">Быстрые действия</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/org/buildings">
            <Button variant="secondary">+ Добавить дом</Button>
          </Link>
          <Link href="/admin/org/members">
            <Button variant="secondary">Пригласить жильца</Button>
          </Link>
          <Link href="/admin/petitions">
            <Button variant="secondary">Заявления</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
