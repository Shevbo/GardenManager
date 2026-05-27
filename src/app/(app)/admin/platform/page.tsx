import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import { Building2, Users, Tag, FileSignature } from 'lucide-react'

const SECTIONS = [
  {
    href: '/admin/platform/orgs',
    icon: Building2,
    title: 'Организации',
    description: 'ЖК / гаражи / другие. Создание, редактирование, удаление.',
  },
  {
    href: '/admin/platform/org-groups',
    icon: Users,
    title: 'Группы организаций',
    description: 'Объединение ЖК в группы для межорг-заявлений.',
  },
  {
    href: '/admin/platform/activities',
    icon: Tag,
    title: 'Активности',
    description: 'Интересы участников: автомобилисты, инвалиды и т.д.',
  },
  {
    href: '/admin/petitions',
    icon: FileSignature,
    title: 'Все заявления',
    description: 'Сводный список заявлений по всем организациям.',
  },
]

export default async function PlatformAdminIndex() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const isAdmin = await isPlatformAdmin(session.user.id)
  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="p-8 max-w-4xl overflow-y-auto flex-1">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Управление справочниками</h1>
      <p className="text-ink/50 text-sm mb-8">
        Платформенный администратор. Структура данных и общие справочники.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}
            className="group bg-white border border-border rounded-2xl p-5 hover:border-forest/30 hover:shadow-sm transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest/5 group-hover:bg-forest/10 flex items-center justify-center shrink-0 transition-colors">
                <Icon size={20} className="text-forest" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-ink text-base mb-1">{title}</h3>
                <p className="text-ink/60 text-sm leading-relaxed">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
