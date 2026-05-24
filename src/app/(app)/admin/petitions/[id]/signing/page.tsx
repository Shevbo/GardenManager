import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { sendNotSignedNotification } from '@/lib/email'
import { canTransition } from '@/lib/petition-status'
import Link from 'next/link'
import { LifecycleStrip } from '@/components/petition/LifecycleStrip'
import { EmojiChips } from '@/components/petition/EmojiChips'
import { CommentList } from '@/components/petition/CommentList'
import type { CommentWithReactions } from '@/components/petition/CommentList'
import type { PetitionStatus } from '@/lib/petition-status'

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

export default async function SigningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: {
        include: {
          memberships: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
      createdByUser: { select: { name: true, phone: true } },
      materials: true,
      signatures: {
        include: { user: { select: { name: true, email: true, phone: true } } },
        orderBy: { signedAt: 'desc' },
      },
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

  const totalMembers = petition.org.memberships.filter(m => m.isOwner).length
  const signedCount = petition.signatures.length

  async function closePetition() {
    'use server'
    const session = await auth()
    if (!session?.user) redirect('/login')

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, orgId: petition!.orgId },
    })
    if (!membership) redirect('/login')

    if (!canTransition(petition!.status as PetitionStatus, 'CLOSED')) return

    const signerIds = new Set(petition!.signatures.map(s => s.userId))
    const notSigners = petition!.org.memberships
      .filter(m => !signerIds.has(m.userId) && m.user.email)
      .map(m => m.user)

    await Promise.allSettled(
      notSigners.map(u => sendNotSignedNotification(u.email!, petition!.title))
    )

    await prisma.petition.update({ where: { id }, data: { status: 'CLOSED' } })
    redirect(`/admin/petitions/${id}/export`)
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)' }}>

      {/* Topbar */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--white)', padding: '0 24px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/admin/petitions" style={{ color: 'var(--ink-soft)', fontSize: '13px', textDecoration: 'none', fontFamily: 'Golos Text, sans-serif' }}>← Заявления</Link>
      </div>

      <LifecycleStrip
        petitionId={id}
        currentStatus={petition.status as PetitionStatus}
        isPublic={petition.isPublic}
      />

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>

        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
          {petition.title}
        </h1>

        {/* Admin action block — Signing stage */}
        <div style={{ background: '#FEF3C7', border: '1px solid #D97706', borderRadius: '6px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '10px', fontWeight: 700, color: '#92400E', letterSpacing: '0.06em', margin: '0 0 4px' }}>ЭТАП: ПОДПИСАНИЕ</p>
            <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '13px', color: '#92400E', margin: 0 }}>
              {signedCount} из {totalMembers} участников подписали
            </p>
          </div>
          {petition.status === 'SIGNING' && (
            <form action={closePetition}>
              <Button type="submit" variant="primary" size="sm">Закрыть сбор подписей →</Button>
            </form>
          )}
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

        {/* Signatures list */}
        <div style={{ background: 'var(--white)', borderRadius: '6px', border: '1px solid var(--border)', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: '0 0 12px' }}>
            Подписи ({signedCount})
          </h3>
          <div>
            {petition.signatures.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Golos Text, sans-serif', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--ink)' }}>{s.user.name ?? s.user.email ?? s.user.phone}</span>
                <span style={{ color: 'var(--ink-soft)', fontSize: '12px' }}>
                  {s.verifiedVia.toUpperCase()} · {new Date(s.signedAt).toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <CommentList
          petitionId={id}
          comments={petition.comments as CommentWithReactions[]}
          currentUserId={session?.user?.id}
        />

      </div>
    </div>
  )
}
