import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { renderDocumentPdf } from '@/lib/pdf/index'
import { formatDocNumber } from '@/lib/doc-number'

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTranscript(
  messages: Array<{ role: string; content: string; userId: string | null }>,
  userMap: Map<string, { name: string | null; email: string | null }>
): string {
  return messages
    .map(m => {
      let author: string
      if (m.role === 'assistant' || !m.userId) {
        author = 'Юрист ИИ'
      } else {
        const u = userMap.get(m.userId)
        author = u?.name ?? u?.email ?? 'Участник'
      }
      return `${author}: ${m.content}`
    })
    .join('\n\n')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'doc'
  const messageId = searchParams.get('messageId') ?? undefined

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: { orgId: true, title: true, docYear: true, docSeq: true },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const messages = messageId
    ? await prisma.petitionLawyerMessage.findMany({
        where: { petitionId: id, id: messageId },
        orderBy: { createdAt: 'asc' },
      })
    : await prisma.petitionLawyerMessage.findMany({
        where: { petitionId: id },
        orderBy: { createdAt: 'asc' },
      })

  const userIds = [...new Set(messages.map(m => m.userId).filter((uid): uid is string => uid !== null))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  const transcript = buildTranscript(messages, userMap)

  const docNumber = formatDocNumber(petition.docYear, petition.docSeq)
  const safeId = (docNumber ?? id).replace(/[^a-zA-Z0-9-_]/g, '-')

  if (format === 'pdf') {
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await renderDocumentPdf({
        layoutKey: 'official-letter',
        values: {},
        title: `Консультация юриста по документу ${docNumber ?? id}`,
        bodyText: transcript,
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'PDF error'
      return NextResponse.json({ error }, { status: 502 })
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lawyer-${safeId}.pdf"`,
      },
    })
  }

  // format=doc — HTML with msword content type
  const htmlLines = transcript
    .split('\n\n')
    .map(para => `<p>${htmlEscape(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  const html =
    '<html><head><meta charset="utf-8"></head><body>\n' +
    htmlLines +
    '\n</body></html>'

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="lawyer-${safeId}.doc"`,
    },
  })
}
