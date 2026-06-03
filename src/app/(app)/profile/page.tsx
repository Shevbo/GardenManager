import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ProfileForm } from './ProfileForm'
import { OwnershipDeclareCard } from '@/components/profile/OwnershipDeclareCard'
import { LogoutButton } from '@/components/auth/LogoutButton'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, phoneVerified: true, address: true },
  })

  if (!user) redirect('/login')

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      org: { select: { name: true } },
      apartment: { include: { building: { select: { address: true } } } },
      ownershipDeclarations: { orderBy: { signedAt: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar title="Профиль" subtitle={user.email ?? ''} actions={<LogoutButton />} />
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <ProfileForm
          initialName={user.name}
          initialAddress={user.address}
          initialPhone={user.phone}
          phoneVerified={!!user.phoneVerified}
        />
        {memberships.length > 0 && (
          <section className="mt-6 max-w-2xl mx-auto">
            <h2 className="font-display text-lg font-bold text-ink mb-3">Подтверждение собственности</h2>
            <div className="space-y-3">
              {memberships.map(m => (
                <OwnershipDeclareCard
                  key={m.id}
                  membershipId={m.id}
                  orgName={m.org.name}
                  apartmentNumber={m.apartment?.number ?? null}
                  buildingAddress={m.apartment?.building?.address ?? null}
                  currentAreaSqm={m.areaSqm}
                  lastDeclaredAt={m.ownershipDeclarations[0]?.signedAt.toISOString() ?? null}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
