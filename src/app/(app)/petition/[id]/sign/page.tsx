'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LegalDisclaimer } from '@/components/petition/LegalDisclaimer'
import Link from 'next/link'

export default function SignPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSign() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/petitions/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalConsent: true }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push(`/petition/${id}`), 2500)
      } else {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Ошибка подписания')
      }
    } catch {
      setError('Ошибка сети. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{
        minHeight: '100%',
        background: 'var(--cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          {/* Animated seal */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M9 18L15 24L27 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--forest)',
            letterSpacing: '-0.02em',
            marginBottom: '10px',
          }}>
            Подпись поставлена
          </h2>
          <p style={{
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '14px',
            color: 'var(--ink-soft)',
            lineHeight: 1.6,
            marginBottom: '0',
          }}>
            Ваша подпись зарегистрирована и включена в лист подписей
          </p>
          <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100%',
      background: 'var(--cream)',
      overflowY: 'auto',
    }}>
      {/* Nav */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        padding: '0 24px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Link href={`/petition/${id}`} style={{
          color: 'var(--ink-soft)',
          fontSize: '13px',
          textDecoration: 'none',
          fontFamily: 'Golos Text, sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          ← Назад к заявлению
        </Link>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'var(--forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 17L8 12L12 16L17 10L21 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="3" y1="21" x2="21" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}>
            Подписание заявления
          </h1>
          <p style={{
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '14px',
            color: 'var(--ink-soft)',
            margin: 0,
            lineHeight: 1.6,
          }}>
            Перед подписанием внимательно ознакомьтесь с условиями
          </p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            color: '#991B1B',
            fontSize: '14px',
            fontFamily: 'Golos Text, sans-serif',
          }}>
            {error}
          </div>
        )}

        <LegalDisclaimer onAccept={handleSign} loading={loading} />

      </div>
    </div>
  )
}
