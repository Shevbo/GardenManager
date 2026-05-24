'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Ошибка отправки')
        return
      }
      setStep('otp')
      setCountdown(60)
    } catch {
      setError('Ошибка сети. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signIn('email-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        redirect: false,
      })
      if (result?.error) {
        setError('Неверный или истёкший код')
        return
      }
      router.push(callbackUrl)
    } catch {
      setError('Ошибка. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setOtp('')
    const res = await fetch('/api/email-otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    if (res.ok) setCountdown(60)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Golos Text, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--white)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '40px 36px',
      }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11L9 16L18 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: 'Unbounded, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            margin: '0 0 6px',
          }}>
            {step === 'email' ? 'Создать аккаунт' : 'Введите код'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
            {step === 'email'
              ? 'Введите email для получения кода'
              : `Код отправлен на ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '14px',
                fontFamily: 'Golos Text, sans-serif',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#6B6B63' : 'var(--forest)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Golos Text, sans-serif',
              }}
            >
              {loading ? 'Отправляем...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '28px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'Golos Text, sans-serif',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#6B6B63' : 'var(--forest)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Golos Text, sans-serif',
              }}
            >
              {loading ? 'Проверяем...' : 'Подтвердить'}
            </button>
            <div style={{ textAlign: 'center' }}>
              {countdown > 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: 0 }}>
                  Отправить повторно через {countdown} сек.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--forest)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'Golos Text, sans-serif',
                    textDecoration: 'underline',
                  }}
                >
                  Отправить код повторно
                </button>
              )}
            </div>
          </form>
        )}

        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', textAlign: 'center', marginTop: '24px' }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{ color: 'var(--forest)', textDecoration: 'none', fontWeight: 600 }}>
            Войти
          </a>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
