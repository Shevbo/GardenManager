import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generatePetitionPdf } from '@/lib/pdf'
import { canTransition } from '@/lib/petition-status'
import type { PetitionStatus } from '@/lib/petition-status'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      signatures: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
  })

  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (petition.status !== 'CLOSED' && petition.status !== 'EXPORTED') {
    return NextResponse.json({ error: 'Petition must be CLOSED before export' }, { status: 400 })
  }
  if (!petition.finalText) {
    return NextResponse.json({ error: 'No final text' }, { status: 400 })
  }

  // Fetch membership for each signer
  const signaturesWithMembership = await Promise.all(
    petition.signatures.map(async sig => {
      const membership = await prisma.membership.findFirst({
        where: { userId: sig.userId, orgId: petition.orgId },
        include: {
          apartment: { select: { number: true } },
          org: { select: { name: true } },
        },
      })
      return { ...sig, membership }
    })
  )

  const pdf = await generatePetitionPdf(
    petition.title,
    petition.finalText,
    signaturesWithMembership
  )

  if (canTransition(petition.status as PetitionStatus, 'EXPORTED')) {
    await prisma.petition.update({ where: { id }, data: { status: 'EXPORTED' } })
  }

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="petition-${id}.pdf"`,
    },
  })
}
