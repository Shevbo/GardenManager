import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default async function DiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      comments: {
        include: { user: { select: { name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!petition) notFound()

  async function startRevision() {
    'use server'
    await prisma.petition.update({
      where: { id },
      data: { status: 'AI_REVISION' },
    })
    redirect(`/admin/petitions/${id}/revision`)
  }

  const canStartRevision = petition.status === 'DISCUSSION'

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{petition.title} — Обсуждение</h1>
        {canStartRevision && (
          <form action={startRevision}>
            <Button type="submit" disabled={petition.comments.length === 0}>
              Запустить AI-ревизию →
            </Button>
          </form>
        )}
      </div>

      <p className="text-sm text-gray-500">{petition.comments.length} комментариев</p>

      <div className="space-y-4">
        {petition.comments.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{c.user.name ?? c.user.email ?? c.user.phone}</span>
              <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('ru-RU')}</span>
            </div>
            <p className="text-sm text-gray-700">{c.text}</p>
          </div>
        ))}
        {petition.comments.length === 0 && (
          <p className="text-gray-400 text-center py-8">Комментариев пока нет</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500 mb-2">Ссылка для собственников:</p>
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
          {`${process.env.NEXT_PUBLIC_URL ?? 'https://garden.shectory.ru'}/petition/${id}`}
        </code>
      </div>
    </div>
  )
}
