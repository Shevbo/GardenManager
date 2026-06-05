import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generatePetitionPdf } from '@/lib/pdf'
import { formatDocNumber } from '@/lib/doc-number'
import { canTransition } from '@/lib/petition-status'
import type { PetitionStatus } from '@/lib/petition-status'
import type { ViewerContext } from '@/lib/pdf/types'
import { isPlatformAdmin } from '@/lib/permissions'

async function buildPetitionPdf(id: string, userId: string) {
  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: { select: { name: true } },
      signatures: {
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
  })
  if (!petition) return null

  const membership = await prisma.membership.findFirst({
    where: { userId, orgId: petition.orgId },
  })
  if (!membership) return { forbidden: true as const }

  if (petition.status !== 'CLOSED' && petition.status !== 'EXPORTED') return { notReady: true as const }
  if (!petition.finalText) return { noText: true as const }

  const signerMemberships = await prisma.membership.findMany({
    where: {
      orgId: petition.orgId,
      userId: { in: petition.signatures.map(s => s.userId) },
    },
    include: {
      apartment: { select: { number: true } },
      org: { select: { name: true } },
    },
  })
  const membershipByUserId = new Map(signerMemberships.map(m => [m.userId, m]))
  const signaturesWithMembership = petition.signatures.map(sig => ({
    ...sig,
    membership: membershipByUserId.get(sig.userId) ?? null,
  }))

  const isAdmin = (membership?.role != null && ['org_admin', 'council_member', 'coalition_admin'].includes(membership.role)) || await isPlatformAdmin(userId)
  const viewer: ViewerContext = { viewerUserId: userId, isAdmin }

  const pdf = await generatePetitionPdf(
    petition.title,
    petition.finalText,
    signaturesWithMembership,
    { recipient: petition.recipient, orgName: petition.senderLine || petition.org.name, viewer, docNumber: formatDocNumber(petition.docYear, petition.docSeq) }
  )
  return { pdf, petition }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const result = await buildPetitionPdf(id, session.user.id)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ('forbidden' in result) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if ('notReady' in result) return NextResponse.json({ error: 'Petition must be CLOSED before export' }, { status: 400 })
  if ('noText' in result) return NextResponse.json({ error: 'No final text' }, { status: 400 })
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new NextResponse(result.pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="petition-${safeId}.pdf"`,
    },
  })
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const result = await buildPetitionPdf(id, session.user.id)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ('forbidden' in result) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if ('notReady' in result) return NextResponse.json({ error: 'Petition must be CLOSED before export' }, { status: 400 })
  if ('noText' in result) return NextResponse.json({ error: 'No final text' }, { status: 400 })
  if (canTransition(result.petition.status as PetitionStatus, 'EXPORTED')) {
    await prisma.petition.update({ where: { id }, data: { status: 'EXPORTED' } })
  }
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new NextResponse(result.pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="petition-${safeId}.pdf"`,
    },
  })
}
