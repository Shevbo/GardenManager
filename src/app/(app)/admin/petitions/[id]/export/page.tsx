import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ExportButton } from './ExportButton'

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: { _count: { select: { signatures: true } } },
  })
  if (!petition) notFound()

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <h1 className="text-xl font-semibold">{petition.title} — Экспорт</h1>

      <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3 text-center">
        <div className="text-4xl">📄</div>
        <p className="font-medium text-green-800">Заявление готово к экспорту</p>
        <p className="text-sm text-green-700">
          {petition._count.signatures} подписей · статус: {petition.status}
        </p>
      </div>

      <ExportButton petitionId={id} />

      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        <p className="font-medium mb-1">Что в документе:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Финальный текст заявления</li>
          <li>Реестр подписей: ФИО, квартира, ЖК, дата, канал верификации</li>
          <li>Дисклеймер о юридической силе электронных подписей</li>
        </ul>
      </div>
    </div>
  )
}
