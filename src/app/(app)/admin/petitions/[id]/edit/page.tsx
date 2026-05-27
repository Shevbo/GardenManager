import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EditPetitionForm } from './EditPetitionForm'

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

  return <EditPetitionForm petition={{
    ...petition,
    discussionDeadline: petition.discussionDeadline?.toISOString() ?? null,
    signingDeadline: petition.signingDeadline?.toISOString() ?? null,
  }} />
}
