import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { renderDocumentPdf } from '@/lib/pdf/index'
import type { LayoutKey } from '@/lib/pdf/types'
import { isPlatformAdmin } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const doc = await prisma.generatedDocument.findUnique({ where: { id }, include: { template: true, petition: true } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let allowed = doc.userId === session.user.id
  if (!allowed && doc.petition) {
    const m = await prisma.membership.findFirst({ where: { userId: session.user.id, orgId: doc.petition.orgId, role: { in: ['org_admin', 'council_member', 'coalition_admin'] } } })
    allowed = !!m || await isPlatformAdmin(session.user.id)
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pdf = await renderDocumentPdf({
    layoutKey: doc.template.layoutKey as LayoutKey,
    values: (doc.fieldValues as Record<string, string>) ?? {},
  })
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="document-${safeId}.pdf"` },
  })
}
