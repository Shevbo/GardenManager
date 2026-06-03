import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { LifecycleStrip } from '@/components/petition/LifecycleStrip'
import { EmojiChips } from '@/components/petition/EmojiChips'
import { CommentList } from '@/components/petition/CommentList'
import type { CommentWithReactions } from '@/components/petition/CommentList'
import type { PetitionStatus } from '@/lib/petition-status'
import { PdfPreviewSidebarLazy } from '@/components/pdf/PdfPreviewSidebarLazy'
import { AIRevisionControls } from './AIRevisionControls'

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

export default async function RevisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: { select: { name: true } },
      createdByUser: { select: { name: true, phone: true } },
      materials: true,
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

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)', padding: '0 24px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/admin/petitions" style={{ color: 'var(--ink-soft)', fontSize: '13px', textDecoration: 'none', fontFamily: 'Golos Text, sans-serif' }}>← Заявления</Link>
      </div>

      <LifecycleStrip
        petitionId={id}
        currentStatus={petition.status as PetitionStatus}
        isPublic={petition.isPublic}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>

        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
          {petition.title}
        </h1>

        {/* Admin action block — AI Revision stage */}
        <div style={{ background: '#FEF3C7', border: '1px solid #D97706', borderRadius: '6px', padding: '16px 20px', marginBottom: '20px' }}>
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '10px', fontWeight: 700, color: '#92400E', letterSpacing: '0.06em', margin: '0 0 4px' }}>ЭТАП: AI РЕВИЗИЯ</p>
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#92400E', margin: '0 0 12px' }}>AI обрабатывает комментарии. Проверьте финальный текст и запустите сбор подписей.</p>
          <AIRevisionControls petitionId={id} />
        </div>

        {/* Document card */}
        <div style={{ background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', borderLeft: '4px solid var(--forest)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>📄 Текст заявления</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: petition.recipient ? '1fr 1fr 1fr' : '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            {petition.recipient && (
              <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border)' }}>
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 5px' }}>Кому</p>
                <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', margin: 0, whiteSpace: 'pre-wrap' }}>{petition.recipient}</p>
              </div>
            )}
            <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 5px' }}>От кого</p>
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', margin: 0 }}>{petition.org.name}</p>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 5px' }}>Инициатор</p>
              <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: 'var(--ink)', margin: '0 0 2px' }}>{petition.createdByUser.name ?? '—'}</p>
              {petition.createdByUser.phone && <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '12px', color: 'var(--ink-soft)', margin: 0 }}>{petition.createdByUser.phone}</p>}
            </div>
          </div>
          <div style={{ padding: '22px 22px 18px', fontFamily: 'Golos Text, sans-serif', fontSize: '15px', lineHeight: '1.8', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{petition.finalText ?? petition.draftText}</div>
          <div style={{ padding: '0 22px 16px' }}>
            <EmojiChips
              entityType="petition"
              entityId={id}
              petitionId={id}
              reactions={groupPetitionReactions(petition.reactions, session?.user?.id)}
              currentUserId={session?.user?.id}
            />
          </div>
        </div>

        <CommentList
          petitionId={id}
          comments={petition.comments as CommentWithReactions[]}
          currentUserId={session?.user?.id}
        />

      </div>
      </div>
      <PdfPreviewSidebarLazy pdfUrl={`/api/petitions/${id}/preview`} />
      </div>
    </div>
  )
}
