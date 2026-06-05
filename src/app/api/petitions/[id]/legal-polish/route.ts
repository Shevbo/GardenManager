import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { legalPolishText } from '@/lib/deepseek'

/**
 * «Обработать юристом ИИ» на этапе черновика — берёт текст из тела запроса
 * (текущий несохранённый текст автора) и возвращает юридически обработанный вариант.
 * Не меняет статус и не пишет в БД — это превью, автор принимает результат вручную.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const petition = await prisma.petition.findUnique({ where: { id }, select: { orgId: true } })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const b = await req.json().catch(() => null) as { text?: string } | null
  const text = (b?.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Пустой текст' }, { status: 400 })

  try {
    const { revisedText, summary } = await legalPolishText(text)
    return NextResponse.json({ revisedText, summary })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Ошибка обработки ИИ' }, { status: 502 })
  }
}
