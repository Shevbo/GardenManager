import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { sendNotSignedNotification } from '@/lib/email'
import { canTransition } from '@/lib/petition-status'
import type { PetitionStatus } from '@/lib/petition-status'

export default async function SigningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      signatures: {
        include: { user: { select: { name: true, email: true, phone: true } } },
        orderBy: { signedAt: 'desc' },
      },
      org: {
        include: {
          memberships: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  })
  if (!petition) notFound()

  const totalMembers = petition.org.memberships.filter(m => m.isOwner).length
  const signedCount = petition.signatures.length

  async function closePetition() {
    'use server'
    const session = await auth()
    if (!session?.user) redirect('/login')

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, orgId: petition!.orgId },
    })
    if (!membership) redirect('/login')

    if (!canTransition(petition!.status as PetitionStatus, 'CLOSED')) return

    const signerIds = new Set(petition!.signatures.map(s => s.userId))
    const notSigners = petition!.org.memberships
      .filter(m => !signerIds.has(m.userId) && m.user.email)
      .map(m => m.user)

    await Promise.allSettled(
      notSigners.map(u => sendNotSignedNotification(u.email!, petition!.title))
    )

    await prisma.petition.update({ where: { id }, data: { status: 'CLOSED' } })
    redirect(`/admin/petitions/${id}/export`)
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{petition.title} — Подписание</h1>
        {petition.status === 'SIGNING' && (
          <form action={closePetition}>
            <Button type="submit" variant="secondary">
              Закрыть сбор подписей
            </Button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Подписало</span>
          <span className="font-semibold">{signedCount} из {totalMembers}</span>
        </div>
        <ProgressBar value={signedCount} max={totalMembers > 0 ? totalMembers : 1} />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-medium mb-4">Подписи ({signedCount})</h3>
        <div className="space-y-2">
          {petition.signatures.map(s => (
            <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
              <span>{s.user.name ?? s.user.email ?? s.user.phone}</span>
              <span className="text-gray-400">
                {s.verifiedVia.toUpperCase()} · {new Date(s.signedAt).toLocaleString('ru-RU')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
