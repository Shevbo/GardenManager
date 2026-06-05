import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { buildRegistryRows, renderPackagePdf } from '@/lib/pdf/index'
import { formatDocNumber } from '@/lib/doc-number'
import { isPlatformAdmin } from '@/lib/permissions'
import type { LayoutKey } from '@/lib/pdf/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

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
  if (!petition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Admin guard: org_admin / council_member / coalition_admin for this org, or platform admin
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      orgId: petition.orgId,
      role: { in: ['org_admin', 'council_member', 'coalition_admin'] },
    },
  })
  const platformAdmin = await isPlatformAdmin(session.user.id)
  if (!membership && !platformAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!petition.finalText && !petition.draftText) {
    return NextResponse.json({ error: 'No text yet' }, { status: 400 })
  }
  const bodyText = petition.finalText ?? petition.draftText ?? ''

  // Build signer membership map (same as export route)
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

  // Admin always sees full PII in the package
  const registryRows = buildRegistryRows(signaturesWithMembership, { viewerUserId: session.user.id, isAdmin: true })

  // Load signed appendices
  const appendices = await prisma.generatedDocument.findMany({
    where: { petitionId: id, status: 'signed' },
    include: { template: true },
  })

  // Build parts: official-letter first (hideFooter = true so package stamps its own), then appendices
  const parts = [
    {
      layoutKey: 'official-letter' as LayoutKey,
      values: {} as Record<string, string>,
      title: petition.title,
      bodyText,
      recipient: petition.recipient,
      fromLine: petition.org.name,
      rows: registryRows,
      masked: false,
      hideFooter: true,
      footerSubject: 'обращение',
      docNumber: formatDocNumber(petition.docYear, petition.docSeq),
    },
    ...appendices.map(doc => ({
      layoutKey: doc.template.layoutKey as LayoutKey,
      values: doc.fieldValues as Record<string, string>,
    })),
  ]

  const pdf = await renderPackagePdf(parts)

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="package-${safeId}.pdf"`,
    },
  })
}
