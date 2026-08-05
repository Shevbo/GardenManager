import Link from 'next/link'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UserCog, ChevronRight } from 'lucide-react'
import { GOV_ROLES, GOV_ROLE_LABELS, type RoleHolder } from '@/lib/org-roles-labels'

/** «Участники и Роли» — governance positions of the active org with holders.
 *  A holder's name links to a 1:1 chat with that person (except yourself). */
export function RolesPanel({
  roles,
  platformAdmins,
  isAdmin,
  currentUserId,
}: {
  roles: RoleHolder[]
  platformAdmins: Array<{ name: string | null }>
  isAdmin: boolean
  currentUserId: string
}) {
  const holderOf = (role: string) => roles.find(r => r.role === role) ?? null

  const rows: Array<{ label: string; holder: string | null; userId?: string; platform?: boolean }> =
    GOV_ROLES.map(role => {
      const h = holderOf(role)
      return { label: GOV_ROLE_LABELS[role], holder: h?.userName ?? null, userId: h?.userId }
    })
  rows.push({
    label: 'Администратор платформы',
    holder: platformAdmins.map(a => a.name).filter(Boolean).join(', ') || null,
    platform: true,
  })

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center justify-between shrink-0">
        <p className="text-xs text-[#6B6B63] uppercase tracking-wide">Участники и роли</p>
        {isAdmin && (
          <Link href="/admin/org/roles">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <UserCog size={13} /> Назначить <ChevronRight size={12} />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardBody className="grid grid-cols-2 gap-x-6 gap-y-2.5 py-4">
        {rows.map(({ label, holder, userId, platform }) => {
          const linkable = !!userId && userId !== currentUserId
          return (
            <div key={label} className="flex items-center justify-between gap-3 min-w-0">
              <span className={`text-sm shrink-0 ${platform ? 'text-[#8A6D1F]' : 'text-[#6B6B63]'}`}>{label}</span>
              {holder && linkable ? (
                <Link href={`/chats/dm/${userId}`} className="text-sm truncate text-right text-[#0A3D2E] font-medium hover:underline">
                  {holder}
                </Link>
              ) : (
                <span className={`text-sm truncate text-right ${holder ? 'text-[#1A1A18] font-medium' : 'text-[#C0BBB0]'}`}>
                  {holder ?? '—'}
                </span>
              )}
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}
