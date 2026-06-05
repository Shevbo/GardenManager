import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { summarizeDocument } from '@/lib/deepseek'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    select: { orgId: true, title: true, draftText: true, finalText: true },
  })
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const text = petition.finalText ?? petition.draftText ?? ''

  let aiSummary: string
  try {
    aiSummary = await summarizeDocument(petition.title, text)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'LLM error'
    return NextResponse.json({ error }, { status: 502 })
  }

  await prisma.petition.update({ where: { id }, data: { aiSummary } })

  return NextResponse.json({ aiSummary })
}
