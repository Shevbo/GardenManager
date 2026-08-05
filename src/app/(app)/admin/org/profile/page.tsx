import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/permissions'
import { getActiveOrgId } from '@/lib/active-org'
import { OrgProfileEditor } from './OrgProfileEditor'

export const dynamic = 'force-dynamic'

export default async function OrgProfilePage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const { org: orgParam } = await searchParams
  const orgId = orgParam || (await getActiveOrgId(userId))
  if (!orgId) redirect('/dashboard')
  if (!(await isOrgAdmin(userId, orgId))) redirect('/dashboard')

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true, name: true, description: true, mapEmbedUrl: true,
      photos: { orderBy: { sortOrder: 'asc' }, select: { id: true, isCover: true } },
    },
  })
  if (!org) redirect('/dashboard')

  return (
    <div className="p-8 max-w-2xl overflow-y-auto flex-1">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink mb-4">
        <ArrowLeft size={15} /> На главную
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Профиль организации</h1>
      <p className="text-ink/50 text-sm mb-6">{org.name} — описание, карта и фотографии для главной страницы.</p>

      <OrgProfileEditor
        orgId={org.id}
        initialDescription={org.description ?? ''}
        initialMapEmbedUrl={org.mapEmbedUrl ?? ''}
        initialPhotos={org.photos}
      />
    </div>
  )
}
