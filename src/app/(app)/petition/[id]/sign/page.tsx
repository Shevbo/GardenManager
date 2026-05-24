import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { SignForm } from './SignForm'

export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/petition/${id}/sign`)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneVerified: true },
  })

  if (!user?.phoneVerified) {
    return (
      <div style={{
        minHeight: '100%',
        background: 'var(--cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          borderTop: '4px solid var(--amber)',
          padding: '40px 36px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: '#FEF3C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>
            Нужен подтверждённый телефон
          </h2>
          <p style={{ fontFamily: 'Golos Text, sans-serif', fontSize: '14px', color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 24px' }}>
            Для подписания заявления необходимо подтвердить номер телефона.
            Это нужно для верификации подписи через SMS.
          </p>
          <Link
            href={`/profile?callbackUrl=/petition/${id}/sign`}
            style={{
              display: 'inline-block',
              background: 'var(--forest)',
              color: 'white',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'Golos Text, sans-serif',
            }}
          >
            Подтвердить телефон →
          </Link>
          <div style={{ marginTop: '16px' }}>
            <Link href={`/petition/${id}`} style={{ fontSize: '13px', color: 'var(--ink-soft)', textDecoration: 'none' }}>
              ← Вернуться к заявлению
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <SignForm id={id} />
}
