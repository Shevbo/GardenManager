import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generatePetitionPdf } from '@/lib/pdf'
import { formatDocNumber } from '@/lib/doc-number'
import type { ViewerContext } from '@/lib/pdf/types'
import { maskSenderLine } from '@/lib/pii'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: { org: { select: { name: true } } },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const text = petition.finalText ?? petition.draftText
  if (!text) return NextResponse.json({ error: 'No text yet' }, { status: 400 })

  // Full personal data (author's contact header + signatories' addresses) is
  // shown ONLY to the petition author; everyone else sees names but not PII.
  const canSeePii = session.user.id === petition.createdBy
  const viewer: ViewerContext = { viewerUserId: session.user.id, canSeePii }
  const fromLine = maskSenderLine(petition.senderLine, canSeePii) || petition.org.name

  const pdf = await generatePetitionPdf(
    petition.title,
    text,
    [],
    { recipient: petition.recipient, orgName: fromLine, viewer, docNumber: formatDocNumber(petition.docYear, petition.docSeq), date: new Date(petition.createdAt).toLocaleDateString("ru-RU") }
  )

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="petition-preview-${safeId}.pdf"`,
    },
  })
}
