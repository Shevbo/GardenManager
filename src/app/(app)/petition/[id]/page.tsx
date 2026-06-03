import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { LifecycleStepper } from '@/components/petition/LifecycleStepper'
import { EmojiChips } from '@/components/petition/EmojiChips'
import { CopyLinkButton } from '@/components/petition/CopyLinkButton'
import { CommentList } from '@/components/petition/CommentList'
import type { CommentWithReactions } from '@/components/petition/CommentList'
import type { PetitionStatus } from '@/lib/petition-status'
import { canInteractWithPetition } from '@/lib/petition-access'

const STATUS_MAP: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  DRAFT:       { label: 'Черновик',   textColor: '#6B6B63', bgColor: '#F0EDE6',  borderColor: '#C4BEB4' },
  DISCUSSION:  { label: 'Обсуждение', textColor: '#4B3FBF', bgColor: '#EDEAFC',  borderColor: '#9B8EE8' },
  AI_REVISION: { label: 'AI Ревизия', textColor: '#92400E', bgColor: '#FEF3C7',  borderColor: '#D97706' },
  SIGNING:     { label: 'Подписание', textColor: '#0A3D2E', bgColor: '#D6F4E5',  borderColor: '#0A3D2E' },
  CLOSED:      { label: 'Закрыто',    textColor: '#374151', bgColor: '#F3F4F6',  borderColor: '#9CA3AF' },
  EXPORTED:    { label: 'Готово',     textColor: '#145C43', bgColor: '#D1FAE5',  borderColor: '#10B981' },
}

function groupPetitionReactions(
  rawReactions: { emoji: string; userId: string; user: { name: string | null } }[],
  currentUserId?: string
) {
  const map = new Map<string, { emoji: string; count: number; hasMyReaction: boolean; users: string[] }>()
  for (const r of rawReactions) {
    const existing = map.get(r.emoji)
    const userName = r.user.name ?? r.userId
    if (existing) {
      existing.count++
      existing.users.push(userName)
      if (r.userId === currentUserId) existing.hasMyReaction = true
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        hasMyReaction: r.userId === currentUserId,
        users: [userName],
      })
    }
  }
  return Array.from(map.values())
}

export default async function PetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: { select: { name: true } },
      orgGroup: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
      materials: true,
      createdByUser: { select: { name: true, phone: true } },
      comments: {
        include: {
          user: { select: { name: true, email: true } },
          reactions: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
      reactions: { include: { user: { select: { name: true } } } },
      _count: { select: { signatures: true } },
    },
  })

  if (!petition) notFound()

  // isPublic guard
  if (!petition.isPublic) {
    const isMember = session?.user
      ? await prisma.membership.findFirst({
          where: { userId: session.user.id, orgId: petition.orgId },
        })
      : null
    if (!isMember) notFound()
  }

  const currentUserId = session?.user?.id

  const userSignature = currentUserId
    ? await prisma.petitionSignature.findUnique({
        where: { petitionId_userId: { petitionId: id, userId: currentUserId } },
      })
    : null

  const isCollecting = ['SIGNING', 'CLOSED', 'EXPORTED'].includes(petition.status)
  const canInteract = currentUserId
    ? await canInteractWithPetition(currentUserId, id)
    : false
  const canSign = petition.status === 'SIGNING' && !userSignature && canInteract
  const statusInfo = STATUS_MAP[petition.status] ?? STATUS_MAP.DRAFT

  const ADMIN_ROLES = ['org_admin', 'council_member', 'coalition_admin', 'platform_admin']
  const userMembership = currentUserId
    ? await prisma.membership.findFirst({
        where: { userId: currentUserId, orgId: petition.orgId },
        select: { role: true },
      })
    : null
  const isAdmin = !!userMembership && ADMIN_ROLES.includes(userMembership.role)
  const canEdit = isAdmin && petition.status === 'DRAFT'

  const showText =
    ['SIGNING', 'CLOSED', 'EXPORTED'].includes(petition.status)
      ? (petition.finalText ?? petition.draftText)
      : petition.draftText

  const uniqueCommenters = new Set(petition.comments.map(c => c.userId)).size
  const deadlineDate = petition.signingDeadline ?? petition.discussionDeadline
  const petitionReactions = groupPetitionReactions(
    petition.reactions.map(r => ({ emoji: r.emoji, userId: r.userId, user: { name: r.user.name } })),
    currentUserId
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = `${appUrl}/petition/${id}`

  return (
    <div style={{ flex: 1, background: 'var(--cream)', overflowY: 'auto' }}>

      {/* Topbar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        padding: '0 24px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/admin/petitions" style={{
          color: 'var(--ink-soft)', fontSize: '13px', textDecoration: 'none',
          fontFamily: 'Golos Text, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          ← Заявления
        </Link>
      </div>

      {/* Lifecycle stepper */}
      <LifecycleStepper status={petition.status as PetitionStatus} />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Title */}
        <h1 style={{
          fontFamily: 'Unbounded, sans-serif',
          fontSize: 'clamp(18px, 3vw, 26px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          margin: '0 0 14px',
        }}>
          {petition.title}
        </h1>

        {/* Status bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '4px',
            border: `1.5px solid ${statusInfo.borderColor}`,
            background: statusInfo.bgColor,
            color: statusInfo.textColor,
            fontSize: '9px',
            fontFamily: 'Unbounded, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {statusInfo.label}
          </span>
          {petition.activity && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber/10 text-amber border border-amber/20">
              Только для: {petition.activity.name}
            </span>
          )}
          {petition.orgGroup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-forest/10 text-forest border border-forest/20">
              Группа ЖК: {petition.orgGroup.name}
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'Golos Text, sans-serif' }}>
            💬 {petition.comments.length}
            {' · '}
            👥 {uniqueCommenters}
            {deadlineDate && (
              <> · до {new Date(deadlineDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</>
            )}
          </span>
          {canEdit && (
            <Link
              href={`/admin/petitions/${id}/edit`}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'var(--amber)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontFamily: 'Golos Text, sans-serif',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ✎ Редактировать
            </Link>
          )}
        </div>

        {/* Signature counter */}
        {isCollecting && (
          <div style={{
            background: 'var(--forest)',
            borderRadius: '12px',
            padding: '24px 28px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '140px', height: '140px',
              borderRadius: '50%',
              border: '22px solid rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: 'clamp(36px, 7vw, 56px)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--amber)',
              }}>
                {petition._count.signatures}
              </span>
              <span style={{
                fontFamily: 'Golos Text, sans-serif',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                paddingBottom: '7px',
              }}>
                {petition._count.signatures === 1 ? 'подпись' :
                 petition._count.signatures < 5 ? 'подписи' : 'подписей'}
              </span>
            </div>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, petition._count.signatures)}%`,
                background: 'var(--amber)',
                borderRadius: '3px',
              }} />
            </div>
          </div>
        )}

        {/* Join prompt for activity-targeted petitions */}
        {petition.activityId && currentUserId && !canInteract && (
          <div className="mt-4 p-4 bg-amber/5 border border-amber/20 rounded-2xl">
            <p className="text-sm text-ink/70">
              Чтобы комментировать и подписывать это заявление, вступите в активность{' '}
              <span className="font-medium text-ink">{petition.activity?.name}</span>.
            </p>
            <a
              href="/activities"
              className="inline-block mt-2 text-sm font-medium text-forest hover:underline"
            >
              Перейти к активностям →
            </a>
          </div>
        )}

        {/* Access notice for orgGroup-targeted petitions */}
        {petition.orgGroupId && currentUserId && !canInteract && (
          <div className="mt-4 p-4 bg-cream border border-border rounded-2xl">
            <p className="text-sm text-ink/70">
              Это заявление доступно только участникам группы ЖК{' '}
              <span className="font-medium text-ink">{petition.orgGroup?.name}</span>.
            </p>
          </div>
        )}

        {/* Document card */}
        <div style={{
          background: 'var(--white)',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--forest)',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          {/* Card header */}
          <div style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              flex: 1,
            }}>
              📄 Текст заявления
            </span>
            <a
              href={`/api/petitions/${id}/export`}
              target="_blank"
              rel="noopener noreferrer"
              title="Скачать PDF"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--cream)',
                color: 'var(--ink)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textDecoration: 'none',
                fontSize: '11px',
                fontFamily: 'Golos Text, sans-serif',
                fontWeight: 700,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v6m0 0l-2.5-2.5M7 8l2.5-2.5M3 11h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <CopyLinkButton url={publicUrl} />
          </div>

          {/* Grid: Кому / От кого / Инициатор */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: petition.recipient ? '1fr 1fr 1fr' : '1fr 1fr',
            borderBottom: '1px solid var(--border)',
          }}>
            {petition.recipient && (
              <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 6px' }}>Кому</p>
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', lineHeight: '1.6', color: 'var(--ink)', margin: 0, whiteSpace: 'pre-wrap' }}>{petition.recipient}</p>
              </div>
            )}
            <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 6px' }}>От кого</p>
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', margin: 0 }}>{petition.org.name}</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 6px' }}>Инициатор</p>
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', margin: '0 0 2px' }}>{petition.createdByUser.name ?? '—'}</p>
              {petition.createdByUser.phone && (
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>{petition.createdByUser.phone}</p>
              )}
            </div>
          </div>

          {/* Text body */}
          <div style={{ padding: '24px 24px 20px', fontFamily: 'Golos Text, sans-serif', fontSize: '15px', lineHeight: '1.8', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {showText}
          </div>

          {/* Emoji reactions on document */}
          <div style={{ padding: '0 24px 18px' }}>
            <EmojiChips
              entityType="petition"
              entityId={id}
              petitionId={id}
              reactions={petitionReactions}
              currentUserId={currentUserId}
            />
          </div>
        </div>

        {/* Materials */}
        {petition.materials.length > 0 && (
          <div style={{
            background: 'var(--white)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            padding: '16px 20px',
            marginBottom: '16px',
          }}>
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 10px' }}>Материалы</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {petition.materials.map(m => (
                <li key={m.id}>
                  <a href={`/api/storage/${encodeURIComponent(m.url)}`} target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--forest)', textDecoration: 'none', fontSize: '14px', fontFamily: 'Golos Text, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>📎</span>
                    <span style={{ borderBottom: '1px dashed rgba(10,61,46,0.3)' }}>{m.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sign CTA */}
        {canSign && (
          <div style={{ background: 'var(--forest)', borderRadius: '6px', padding: '24px 28px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '110px', height: '110px', borderRadius: '50%', border: '18px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--white)', margin: '0 0 8px' }}>Поддержите это заявление</h3>
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: '0 0 18px', lineHeight: 1.6 }}>Ваша подпись юридически значима</p>
            <Link href={`/petition/${id}/sign`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--amber)', color: 'var(--ink)', padding: '11px 20px', borderRadius: '6px', fontFamily: 'Unbounded, sans-serif', fontSize: '12px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.01em' }}>
              Поставить подпись →
            </Link>
          </div>
        )}

        {/* Already signed */}
        {userSignature && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#EDFAF3', border: '1px solid #7ECFA4', borderRadius: '6px', padding: '14px 18px', marginBottom: '16px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--forest)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, fontWeight: 700 }}>✓</div>
            <div>
              <p style={{ margin: 0, fontFamily: 'Unbounded, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--forest)', letterSpacing: '-0.01em' }}>Вы подписали это заявление</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', fontFamily: 'Golos Text, sans-serif', color: '#3D8B65' }}>
                {userSignature.signedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Comment feed — always shown */}
        <CommentList
          petitionId={id}
          comments={petition.comments as CommentWithReactions[]}
          currentUserId={currentUserId}
        />

      </div>
    </div>
  )
}
