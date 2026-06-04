import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import { TemplatesManager } from './TemplatesManager'

export default async function DocumentTemplatesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard')
  return <TemplatesManager />
}
