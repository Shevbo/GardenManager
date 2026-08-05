import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/permissions'
import { getActiveOrgId } from '@/lib/active-org'
import { getOrgRoles } from '@/lib/org-roles'
import { RolesEditor } from './RolesEditor'

export const dynamic = 'force-dynamic'

export default async function OrgRolesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const orgId = await getActiveOrgId(userId)
  if (!orgId) redirect('/dashboard')
  if (!(await isOrgAdmin(userId, orgId))) redirect('/dashboard')

  const [org, memberships, assignments] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.membership.findMany({
      where: { orgId },
      select: { userId: true, user: { select: { name: true, email: true, phone: true } } },
    }),
    getOrgRoles(orgId),
  ])

  const byId = new Map<string, { id: string; label: string }>()
  for (const m of memberships) {
    if (byId.has(m.userId)) continue
    byId.set(m.userId, { id: m.userId, label: m.user.name || m.user.email || m.user.phone || m.userId })
  }
  const members = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'))

  const initial: Record<string, string> = {}
  for (const a of assignments) initial[a.role] = a.userId

  return (
    <div className="p-8 max-w-2xl overflow-y-auto flex-1">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4">
        <ArrowLeft size={15} /> На главную
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Роли и должности</h1>
      <p className="text-ink/50 text-sm mb-6">
        {org?.name ?? 'Организация'} — назначьте участников на должности. Одна должность = один участник.
      </p>

      <RolesEditor orgId={orgId} members={members} initial={initial} />
    </div>
  )
}
