import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeResults } from '@/lib/assembly-results'
import { generateAssemblyProtocolPdf } from '@/lib/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: {
      org: { select: { name: true } },
      createdByUser: { select: { name: true } },
    },
  })
  if (!assembly) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (assembly.status !== 'CLOSED') {
    return NextResponse.json({ error: 'Assembly must be CLOSED to generate protocol' }, { status: 400 })
  }

  const results = await computeResults(id)
  if (!results) return NextResponse.json({ error: 'No results' }, { status: 500 })

  const pdf = await generateAssemblyProtocolPdf({
    assembly: {
      title: assembly.title,
      description: assembly.description,
      type: assembly.type,
      startsAt: assembly.startsAt,
      endsAt: assembly.endsAt,
      closedAt: assembly.closedAt,
      quorumPercent: assembly.quorumPercent,
      createdByUser: assembly.createdByUser,
      org: assembly.org,
    },
    questions: results.questions,
    quorumPct: results.quorumPct,
    quorumReached: results.quorumReached,
    totalEligibleArea: results.totalEligibleArea,
    totalVotedArea: results.totalVotedArea,
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="protocol-${id}.pdf"`,
    },
  })
}
