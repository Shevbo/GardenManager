import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isPlatformAdmin } from '@/lib/permissions'

/**
 * Серверный гейт на ВЕСЬ раздел «Управление» (/admin/platform/*): страницы
 * раздела — клиентские компоненты, и без этого layout их шелл отдавался
 * любому авторизованному (данные закрывал только API). Не-админ уходит
 * на главную.
 */
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard')
  return <>{children}</>
}
