'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function accept() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Ошибка')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
        Вы успешно вступили в организацию! Перенаправляем...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={accept} loading={loading} className="w-full">
        Принять приглашение
      </Button>
    </div>
  )
}
