import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UnderConstruction } from '@/components/ui/UnderConstruction'

export default async function Page() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <UnderConstruction title="Активности" />
}
