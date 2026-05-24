import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AcceptInviteButton from './AcceptInviteButton'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await auth()

  const invite = await prisma.inviteLink.findUnique({
    where: { token },
    include: {
      org: { select: { name: true, type: true } },
      apartment: { include: { building: { select: { address: true } } } },
    },
  })

  if (!invite) notFound()

  const expired = invite.expiresAt && invite.expiresAt < new Date()
  const used = !!invite.usedBy

  if (!session?.user) {
    redirect(`/login?callbackUrl=/invite/${token}`)
  }

  return (
    <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full space-y-6">
        <div>
          <div className="text-3xl mb-3">🏠</div>
          <h1 className="text-xl font-semibold">Приглашение в {invite.org.name}</h1>
          {invite.apartment && (
            <p className="text-sm text-gray-500 mt-1">
              Квартира {invite.apartment.number}, {invite.apartment.building.address}
            </p>
          )}
        </div>

        {used ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Эта ссылка уже была использована.
          </div>
        ) : expired ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            Срок действия ссылки истёк. Попросите администратора создать новую.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Вы вошли как <strong>{session.user.email || session.user.name}</strong>.
              Нажмите «Принять», чтобы стать участником организации.
            </p>
            <AcceptInviteButton token={token} />
          </>
        )}
      </div>
    </div>
  )
}
