'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LegalDisclaimer } from '@/components/petition/LegalDisclaimer'

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
        setTimeout(() => router.push(`/petition/${id}`), 2000)
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
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-green-700">Заявление подписано!</h2>
        <p className="text-sm text-gray-500 mt-2">Перенаправляем обратно...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-10 space-y-6">
      <h1 className="text-xl font-semibold">Подписание заявления</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
      <LegalDisclaimer onAccept={handleSign} loading={loading} />
    </div>
  )
}
