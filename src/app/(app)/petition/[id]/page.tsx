import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { StatusBadge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CommentForm } from '@/components/petition/CommentForm'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик', DISCUSSION: 'Обсуждение', AI_REVISION: 'Ревизия',
  SIGNING: 'Подписание', CLOSED: 'Закрыто', EXPORTED: 'Готово',
}

export default async function PetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      materials: true,
      comments: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { signatures: true } },
    },
  })

  if (!petition) notFound()

  const userSignature = session?.user
    ? await prisma.petitionSignature.findUnique({
        where: { petitionId_userId: { petitionId: id, userId: session.user.id } },
      })
    : null

  const canComment = petition.status === 'DISCUSSION'
  const canSign = petition.status === 'SIGNING' && !userSignature && !!session?.user

  return (
    <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{petition.title}</h1>
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium tracking-wide uppercase bg-[#F0EDE6] text-[#6B6B63] rounded">
          {STATUS_LABELS[petition.status] ?? petition.status}
        </span>
      </div>

      <div className="prose prose-sm max-w-none bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <p className="whitespace-pre-wrap">
          {petition.status === 'SIGNING' || petition.status === 'CLOSED' || petition.status === 'EXPORTED'
            ? petition.finalText ?? petition.draftText
            : petition.draftText}
        </p>
      </div>

      {petition.materials.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-medium mb-3">Материалы</h3>
          <ul className="space-y-2">
            {petition.materials.map(m => (
              <li key={m.id}>
                <a href={m.url} className="text-blue-600 hover:underline text-sm">
                  {m.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canSign && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200">
          <h3 className="font-medium mb-3">Подписать заявление</h3>
          <Link href={`/petition/${id}/sign`}>
            <Button className="w-full">Перейти к подписанию →</Button>
          </Link>
        </div>
      )}

      {userSignature && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">
          ✓ Вы подписали это заявление {userSignature.signedAt.toLocaleDateString('ru-RU')}
        </div>
      )}

      {petition.status === 'SIGNING' && (
        <div className="text-sm text-gray-500 text-center">
          Подписало: {petition._count.signatures} собственников
        </div>
      )}

      {canComment && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-medium mb-4">Комментарии и предложения по тексту</h3>
          <div className="space-y-3 mb-4">
            {petition.comments.map(c => (
              <div key={c.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm font-medium text-gray-700">
                  {c.user.name ?? c.user.email}
                </p>
                <p className="text-sm text-gray-600 mt-1">{c.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            ))}
          </div>
          {session?.user && (
            <CommentForm petitionId={id} />
          )}
        </div>
      )}
    </div>
  )
}
