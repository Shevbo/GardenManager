'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Mode = 'choose' | 'email' | 'phone' | 'otp'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn('resend', { email, callbackUrl: '/' })
    } catch {
      setError('Не удалось отправить ссылку. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (res.ok) {
        setMode('otp')
      } else {
        setError(data.error ?? 'Не удалось отправить SMS')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })
      const data = await res.json()
      if (res.ok) {
        window.location.href = '/'
      } else {
        setError(data.error ?? 'Неверный код')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-900">
          Garden Manager
        </h1>

        {mode === 'choose' && (
          <div className="space-y-3">
            <Button className="w-full" onClick={() => signIn('google', { callbackUrl: '/' })}>
              Войти через Google
            </Button>
            <Button className="w-full" onClick={() => signIn('vk', { callbackUrl: '/' })}>
              Войти через VK / Mail.ru
            </Button>
            <Button className="w-full" onClick={() => signIn('yandex', { callbackUrl: '/' })}>
              Войти через Яндекс
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">или</span>
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setMode('email')}>
              По email
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setMode('phone')}>
              По номеру телефона (SMS)
            </Button>
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Отправляем...' : 'Получить ссылку на email'}
            </Button>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="text-sm text-gray-500 w-full text-center hover:text-gray-700"
            >
              ← Назад
            </button>
          </form>
        )}

        {mode === 'phone' && (
          <form onSubmit={handlePhoneSend} className="space-y-4">
            <Input
              type="tel"
              placeholder="+79991234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Отправляем...' : 'Получить SMS-код'}
            </Button>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="text-sm text-gray-500 w-full text-center hover:text-gray-700"
            >
              ← Назад
            </button>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Введите код из SMS на номер {phone}
            </p>
            <Input
              type="text"
              placeholder="123456"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
              {loading ? 'Проверяем...' : 'Войти'}
            </Button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setOtp(''); setError('') }}
              className="text-sm text-gray-500 w-full text-center hover:text-gray-700"
            >
              ← Изменить номер
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
