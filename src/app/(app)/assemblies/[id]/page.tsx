import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { AssemblyRoom } from './AssemblyRoom'
import { computeResults } from '@/lib/assembly-results'
import { PdfPreviewSidebar } from '@/components/pdf/PdfPreviewSidebar'

const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']

export default async function AssemblyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: {
      org: { select: { id: true, name: true } },
      createdByUser: { select: { name: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  })
  if (!assembly) notFound()

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, orgId: assembly.orgId },
    select: { role: true, isOwner: true, areaSqm: true },
  })
  if (!membership) redirect('/assemblies')

  const isAdmin = ADMIN_ROLES.includes(membership.role)
  const canVote = !!membership.isOwner && (membership.areaSqm ?? 0) > 0 && assembly.status === 'VOTING'

  const myVotes = await prisma.assemblyVote.findMany({
    where: { question: { assemblyId: id }, userId: session.user.id },
    select: { questionId: true, choice: true, castAt: true },
  })

  const results = assembly.status === 'CLOSED' ? await computeResults(id) : null

  return (
    <div className="flex-1 flex min-h-0">
      <div className="overflow-y-auto flex-1">
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/assemblies" className="text-sm text-forest hover:underline">
          ← К списку
        </Link>

        <AssemblyRoom
          assembly={{
            id: assembly.id,
            title: assembly.title,
            description: assembly.description,
            type: assembly.type,
            status: assembly.status,
            startsAt: assembly.startsAt.toISOString(),
            endsAt: assembly.endsAt.toISOString(),
            closedAt: assembly.closedAt?.toISOString() ?? null,
            quorumPercent: assembly.quorumPercent,
            org: assembly.org,
            createdByUser: assembly.createdByUser,
            questions: assembly.questions,
          }}
          isAdmin={isAdmin}
          canVote={canVote}
          membership={{
            isOwner: !!membership.isOwner,
            areaSqm: membership.areaSqm ?? 0,
          }}
          myVotes={myVotes.map(v => ({ questionId: v.questionId, choice: v.choice, castAt: v.castAt.toISOString() }))}
          results={results}
        />
      </div>
      </div>
      {assembly.status === 'CLOSED' && (
        <PdfPreviewSidebar pdfUrl={`/api/assemblies/${id}/protocol`} />
      )}
    </div>
  )
}
