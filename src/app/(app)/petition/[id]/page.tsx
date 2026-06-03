import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

const NEXT_STEP: Record<string, string> = {
  DRAFT: 'edit', DISCUSSION: 'discussion', AI_REVISION: 'revision',
  SIGNING: 'signing', CLOSED: 'export', EXPORTED: 'export',
}

export default async function PetitionPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  // Logged-in users go directly to the app petition page
  if (session?.user) {
    const petition = await prisma.petition.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!petition) notFound()
    redirect(`/admin/petitions/${id}/${NEXT_STEP[petition.status] ?? 'discussion'}`)
  }

  // Guest: fetch petition for display
  const petition = await prisma.petition.findUnique({
    where: { id },
    select: {
      id: true, title: true, status: true, isPublic: true,
      finalText: true, draftText: true, recipient: true,
      org: { select: { name: true } },
      _count: { select: { signatures: true } },
    },
  })
  if (!petition) notFound()

  // Not public + not logged in → require login
  if (!petition.isPublic) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/petition/${id}`)}`)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(`/petition/${id}`)}`

  return (
    <div style={{ minHeight: '100vh', background: '#F2F0EB', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px 80px', fontFamily: 'Golos Text, sans-serif' }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '14px', fontWeight: 700, color: '#0A3D2E', letterSpacing: '0.05em' }}>
          GARDEN MANAGER
        </span>
      </div>

      {/* Document card */}
      <div style={{ width: '100%', maxWidth: '680px', background: 'white', borderRadius: '4px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '56px 64px 48px' }}>

        {/* Header: Кому / От кого */}
        {(petition.recipient || petition.org.name) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '45%' }}>
              {petition.recipient && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '9px', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>Кому</p>
                  <p style={{ fontSize: '13px', color: '#1A1A18', lineHeight: 1.5 }}>{petition.recipient}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '9px', fontFamily: 'Unbounded, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>От кого</p>
                <p style={{ fontSize: '13px', color: '#1A1A18', lineHeight: 1.5 }}>{petition.org.name}</p>
                <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{petition._count.signatures} подписантов</p>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '18px', fontWeight: 700, textAlign: 'center', color: '#1A1A18', marginBottom: '28px', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
          {petition.title}
        </h1>

        {/* Divider */}
        <div style={{ borderTop: '2px solid #1A1A18', marginBottom: '28px' }} />

        {/* Body text */}
        <p style={{ fontSize: '15px', lineHeight: '1.85', color: '#1A1A18', textAlign: 'justify', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
          {petition.finalText ?? petition.draftText ?? ''}
        </p>

        {/* Status line */}
        <div style={{ borderTop: '1px solid #E0DBD0', paddingTop: '16px' }}>
          <span style={{ fontSize: '11px', color: '#888', fontFamily: 'Unbounded, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {petition.status === 'SIGNING'
              ? `${petition._count.signatures} подписей · Идёт подписание`
              : petition.status === 'CLOSED' || petition.status === 'EXPORTED'
                ? `${petition._count.signatures} подписей · Закрыто`
                : 'Заявление готовится'}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: '24px', width: '100%', maxWidth: '680px' }}>
        <a href={loginUrl} style={{
          display: 'block', background: '#0A3D2E', color: 'white', textDecoration: 'none',
          borderRadius: '10px', padding: '14px 24px', textAlign: 'center',
          fontFamily: 'Golos Text, sans-serif', fontSize: '15px', fontWeight: 600,
        }}>
          {petition.status === 'SIGNING'
            ? 'Войдите чтобы подписать и комментировать →'
            : 'Войдите чтобы прокомментировать →'}
        </a>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', marginTop: '10px' }}>
          Garden Manager · <a href={appUrl} style={{ color: '#0A3D2E' }}>garden.shectory.ru</a>
        </p>
      </div>
    </div>
  )
}
