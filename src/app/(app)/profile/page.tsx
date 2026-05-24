import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, phoneVerified: true, address: true },
  })

  if (!user) redirect('/login')

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar title="Профиль" subtitle={user.email ?? ''} />
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <ProfileForm
          initialName={user.name}
          initialAddress={user.address}
          initialPhone={user.phone}
          phoneVerified={!!user.phoneVerified}
        />
      </div>
    </div>
  )
}
