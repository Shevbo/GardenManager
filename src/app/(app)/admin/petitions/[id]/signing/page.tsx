import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'

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
      org: { include: { memberships: true } },
    },
  })
  if (!petition) notFound()

  const totalMembers = petition.org.memberships.length
  const signedCount = petition.signatures.length

  async function closePetition() {
    'use server'
    await fetch(`${process.env.NEXTAUTH_URL}/api/petitions/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
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
