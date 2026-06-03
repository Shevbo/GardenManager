import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { EditPetitionForm } from './EditPetitionForm'
import { LifecycleStrip } from '@/components/petition/LifecycleStrip'
import type { PetitionStatus } from '@/lib/petition-status'
import { PdfPreviewSidebarLazy } from '@/components/pdf/PdfPreviewSidebarLazy'

export default async function EditPetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const petition = await prisma.petition.findUnique({
    where: { id },
    select: {
      id: true, title: true, draftText: true, recipient: true,
      status: true, orgId: true, orgGroupId: true, activityId: true,
      discussionDeadline: true, signingDeadline: true,
    },
  })
  if (!petition) notFound()

  if (petition.status !== 'DRAFT') {
    redirect(`/admin/petitions/${id}/discussion`)
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: petition.orgId },
  })
  if (!membership) redirect('/dashboard')

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)', padding: '0 24px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/admin/petitions" style={{ color: 'var(--ink-soft)', fontSize: '13px', textDecoration: 'none', fontFamily: 'Golos Text, sans-serif' }}>← Заявления</Link>
      </div>
      <LifecycleStrip petitionId={id} currentStatus={petition.status as PetitionStatus} isPublic={false} />
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditPetitionForm petition={{
            ...petition,
            discussionDeadline: petition.discussionDeadline?.toISOString() ?? null,
            signingDeadline: petition.signingDeadline?.toISOString() ?? null,
          }} />
        </div>
        <PdfPreviewSidebarLazy pdfUrl={`/api/petitions/${id}/preview`} />
      </div>
    </div>
  )
}
