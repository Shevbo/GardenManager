import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { Users, FileText, Pen, CheckCircle2, ChevronRight, Plus, Clock } from 'lucide-react'
import type { PetitionStatus } from '@/lib/petition-status'

function petitionHref(id: string, status: PetitionStatus): string {
  switch (status) {
    case 'DISCUSSION':  return `/admin/petitions/${id}/discussion`
    case 'AI_REVISION': return `/admin/petitions/${id}/revision`
    case 'SIGNING':     return `/admin/petitions/${id}/signing`
    case 'CLOSED':
    case 'EXPORTED':    return `/admin/petitions/${id}/export`
    default:            return `/admin/petitions`
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { org: true, apartment: true },
  })

  if (!membership) {
    return (
      <div className="flex flex-col" style={{ height: '100vh' }}>
        <Topbar title="Главная" subtitle="Нет организации" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#6B6B63]">Вы не привязаны ни к одной организации</p>
        </div>
      </div>
    )
  }

  const orgId = membership.orgId

  const [memberCount, petitions, mySignatures] = await Promise.all([
    prisma.membership.count({ where: { orgId } }),
    prisma.petition.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { signatures: true, comments: true } } },
    }),
    prisma.petitionSignature.findMany({
      where: { userId },
      select: { petitionId: true },
    }),
  ])

  const signedIds = new Set(mySignatures.map(s => s.petitionId))
  const signingPetitions = petitions.filter(p => p.status === 'SIGNING')
  const unsignedPetition = signingPetitions.find(p => !signedIds.has(p.id)) ?? null
  const recentPetitions = petitions.slice(0, 6)

  const subtitle = [
    membership.org.name,
    membership.apartment ? `кв. ${membership.apartment.number}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar title="Главная" subtitle={subtitle} />

      <div className="flex flex-col gap-5 px-5 py-4 flex-1 min-h-0">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Собственников',   value: memberCount,         icon: Users },
            { label: 'Всего заявлений', value: petitions.length,    icon: FileText },
            { label: 'На подписании',   value: signingPetitions.length, icon: Pen },
            { label: 'Я подписал(а)',   value: mySignatures.length, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardBody className="flex items-center gap-4 py-5">
                <div className="w-10 h-10 bg-[#F0EDE6] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#0A3D2E]" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-[#1A1A18] leading-none">{value}</p>
                  <p className="text-sm text-[#6B6B63] mt-1.5">{label}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* 2-column layout */}
        <div className="flex gap-5 flex-1 min-h-0">

          {/* Col 1: Active signing petition */}
          <div className="flex flex-col" style={{ flex: '0 0 38%' }}>
            <Card className="flex flex-col h-full">
              <CardHeader className="shrink-0">
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide mb-2">
                  Требует вашей подписи
                </p>
                <h2 className="text-base font-semibold text-[#1A1A18] leading-snug">
                  {unsignedPetition ? unsignedPetition.title : 'Нет активных сборов'}
                </h2>
              </CardHeader>

              {unsignedPetition ? (
                <CardBody className="flex flex-col flex-1 gap-4">
                  <ProgressBar
                    value={unsignedPetition._count.signatures}
                    max={memberCount || 1}
                    label={`${unsignedPetition._count.signatures} из ${memberCount} подписей`}
                    sublabel={`${Math.round((unsignedPetition._count.signatures / (memberCount || 1)) * 100)}%`}
                    variant="forest"
                  />
                  {unsignedPetition.signingDeadline && (
                    <div className="flex items-center gap-2 text-sm text-[#6B6B63]">
                      <Clock size={14} className="shrink-0" />
                      <span>Срок подписания:</span>
                      <span className="font-medium text-[#1A1A18]">
                        {formatDate(unsignedPetition.signingDeadline)}
                      </span>
                    </div>
                  )}
                  <div className="mt-auto">
                    <Link href={`/petition/${unsignedPetition.id}/sign`}>
                      <Button variant="primary" className="w-full">Подписать заявление</Button>
                    </Link>
                  </div>
                </CardBody>
              ) : (
                <CardBody className="flex flex-col flex-1 items-center justify-center gap-4 text-center">
                  <CheckCircle2 size={32} className="text-[#C0BBB0]" />
                  <p className="text-sm text-[#6B6B63]">
                    {petitions.length === 0
                      ? 'Заявлений пока нет'
                      : 'Все активные заявления подписаны'}
                  </p>
                  <Link href="/admin/petitions/new">
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Plus size={14} /> Создать заявление
                    </Button>
                  </Link>
                </CardBody>
              )}

              <CardFooter className="flex items-center justify-between shrink-0">
                <span className="text-xs text-[#6B6B63]">
                  {signingPetitions.length} на подписании
                </span>
                <Link href="/admin/petitions">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    Все заявления <ChevronRight size={13} />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          {/* Col 2: Recent petitions */}
          <div className="flex flex-col flex-1 min-w-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex items-center justify-between shrink-0">
                <p className="text-xs text-[#6B6B63] uppercase tracking-wide">Последние заявления</p>
                <Link href="/admin/petitions">
                  <Button variant="ghost" size="sm" className="text-xs gap-0.5 -mr-1">
                    Все <ChevronRight size={12} />
                  </Button>
                </Link>
              </CardHeader>

              {recentPetitions.length === 0 ? (
                <CardBody className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-[#6B6B63] mb-3">Заявлений пока нет</p>
                    <Link href="/admin/petitions/new">
                      <Button variant="primary" size="sm" className="gap-1">
                        <Plus size={14} /> Создать первое
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              ) : (
                <div className="flex flex-col divide-y divide-[#E0DBD0] flex-1 overflow-y-auto">
                  {recentPetitions.map(p => (
                    <Link
                      key={p.id}
                      href={petitionHref(p.id, p.status as PetitionStatus)}
                      className="block hover:bg-[#F7F5F0] transition-colors"
                    >
                      <div className="flex flex-col gap-1.5 px-5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-[#1A1A18] leading-snug line-clamp-2 flex-1">
                            {p.title}
                          </p>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6B6B63]">
                          <span>{p._count.signatures} подп.</span>
                          <span>{p._count.comments} комм.</span>
                          {signedIds.has(p.id) && (
                            <span className="text-[#1A6B3A] font-medium">✓ подписано</span>
                          )}
                          <span className="ml-auto">{formatDate(p.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
