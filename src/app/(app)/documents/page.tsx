import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DocumentsManager } from './DocumentsManager'

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <DocumentsManager />
}
