import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { About } from '@/components/about/About'

export default async function AboutPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <About />
}
