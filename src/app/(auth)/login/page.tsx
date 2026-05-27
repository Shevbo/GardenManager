'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Mode = 'password' | 'otp-request' | 'otp-verify'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const r = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (r?.error) setError('Неверный email или пароль')
      else window.location.href = '/'
    } catch { setError('Ошибка входа. Попробуйте снова.') }
    finally { setLoading(false) }
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setInfo('')
    try {
      const r = await fetch('/api/email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Не удалось отправить код')
      } else {
        setInfo(`Код отправлен на ${email}. Проверьте почту.`)
        setMode('otp-verify')
      }
    } catch { setError('Ошибка. Попробуйте снова.') }
    finally { setLoading(false) }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const r = await signIn('email-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        redirect: false,
      })
      if (r?.error) setError('Неверный или истёкший код')
      else window.location.href = '/'
    } catch { setError('Ошибка. Попробуйте снова.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-semibold mb-1 text-center text-gray-900">
          Garden Manager
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          {mode === 'password' && 'Войдите с паролем Shectory'}
          {mode === 'otp-request' && 'Получите код входа на email'}
          {mode === 'otp-verify' && 'Введите код из письма'}
        </p>

        {mode === 'password' && (
          <form onSubmit={loginPassword} className="space-y-4">
            <Input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <Input type="password" placeholder="Пароль" value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Входим...' : 'Войти'}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => { setError(''); setMode('otp-request') }}
                className="text-sm text-forest hover:underline">
                Забыли пароль? Войти по коду
              </button>
            </div>
          </form>
        )}

        {mode === 'otp-request' && (
          <form onSubmit={requestOtp} className="space-y-4">
            <Input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Отправляем...' : 'Получить код'}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => { setError(''); setMode('password') }}
                className="text-sm text-gray-500 hover:underline">
                ← Войти с паролем
              </button>
            </div>
          </form>
        )}

        {mode === 'otp-verify' && (
          <form onSubmit={verifyOtp} className="space-y-4">
            {info && <p className="text-forest text-sm bg-forest/5 p-3 rounded">{info}</p>}
            <Input type="text" inputMode="numeric" placeholder="Код из письма (6 цифр)"
              value={otp} onChange={e => setOtp(e.target.value)} required
              autoComplete="one-time-code" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Входим...' : 'Войти'}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => { setError(''); setInfo(''); setMode('otp-request') }}
                className="text-sm text-gray-500 hover:underline">
                Получить новый код
              </button>
            </div>
          </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          Нет аккаунта?{' '}
          <a href="/register" className="text-blue-600 hover:underline">Зарегистрироваться</a>
        </p>
      </div>
    </div>
  )
}
