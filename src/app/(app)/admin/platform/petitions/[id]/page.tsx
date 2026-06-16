import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isPlatformAdmin } from '@/lib/permissions'
import { ArrowLeft } from 'lucide-react'
import { AdminPetitionEditor } from './AdminPetitionEditor'

export const dynamic = 'force-dynamic'

export default async function AdminPetitionEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!(await isPlatformAdmin(session.user.id))) redirect('/dashboard')

  const { id } = await params
  const petition = await prisma.petition.findUnique({
    where: { id },
    include: { _count: { select: { signatures: true, comments: true } } },
  })
  if (!petition) notFound()

  const [orgs, groups, activities] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.orgGroup.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.activity.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const data = {
    id: petition.id,
    title: petition.title,
    status: petition.status,
    orgId: petition.orgId,
    orgGroupId: petition.orgGroupId,
    activityId: petition.activityId,
    recipient: petition.recipient,
    senderLine: petition.senderLine,
    draftText: petition.draftText,
    finalText: petition.finalText,
    aiSummary: petition.aiSummary,
    isPublic: petition.isPublic,
    discussionDeadline: petition.discussionDeadline?.toISOString() ?? null,
    signingDeadline: petition.signingDeadline?.toISOString() ?? null,
    signatures: petition._count.signatures,
    comments: petition._count.comments,
    docNumber: petition.docYear && petition.docSeq
      ? `${petition.docYear}-${String(petition.docSeq).padStart(3, '0')}`
      : null,
  }

  return (
    <div className="p-8 max-w-3xl mx-auto overflow-y-auto flex-1">
      <Link href="/admin/platform/petitions" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4">
        <ArrowLeft size={15} /> Репозиторий заявлений
      </Link>
      <AdminPetitionEditor petition={data} orgs={orgs} groups={groups} activities={activities} />
    </div>
  )
}
