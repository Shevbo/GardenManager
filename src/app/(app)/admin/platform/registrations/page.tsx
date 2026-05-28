import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'
import { RegistrationsTable } from './RegistrationsTable'

type RegRow = {
  id: string
  requestedAddress: string
  addressNormalized: string | null
  apartmentNumber: string | null
  areaSqm: number | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user: { email: string | null; name: string | null }
}

export default async function RegistrationsQueuePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard')

  const [pending, approved, rejected] = await Promise.all([
    prisma.pendingRegistration.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.pendingRegistration.count({ where: { status: 'APPROVED' } }),
    prisma.pendingRegistration.count({ where: { status: 'REJECTED' } }),
  ])

  const orgs = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const rows: RegRow[] = pending.map(p => ({
    id: p.id,
    requestedAddress: p.requestedAddress,
    addressNormalized: p.addressNormalized,
    apartmentNumber: p.apartmentNumber,
    areaSqm: p.areaSqm,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    user: p.user,
  }))

  return (
    <div className="p-8 max-w-5xl overflow-y-auto flex-1">
      <a href="/admin/platform" className="text-sm text-forest hover:underline mb-4 inline-block">
        ← Управление справочниками
      </a>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Заявки на регистрацию</h1>
      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className="bg-amber/15 text-amber-700 px-2.5 py-1 rounded-full">
          Ожидают: {rows.length}
        </span>
        <span className="bg-forest/10 text-forest px-2.5 py-1 rounded-full">
          Одобрены: {approved}
        </span>
        <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
          Отклонены: {rejected}
        </span>
      </div>

      <RegistrationsTable rows={rows} orgs={orgs} />
    </div>
  )
}
